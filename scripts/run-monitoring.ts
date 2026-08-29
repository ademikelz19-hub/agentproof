import { db, agents, services, probeRuns, observations } from '@agentproof/db';
import { EightOFourScanAdapter } from '@agentproof/sources';
import {
  ProbeRateLimiter,
  probeServiceReachability,
  probeHttpStatus,
  probeResponseLatency,
  probeProtocolResponseValidity,
  probeMetadataResolution,
} from '@agentproof/probes';
import { BSC, type ProbeTarget, type ChainId, type ServiceProtocol } from '@agentproof/core';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  console.log('--- Starting AgentProof Ingestion & Monitoring Run ---');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment or .env.local');
  }

  // 1. Initialize 8004scan Adapter
  const adapter = new EightOFourScanAdapter();
  console.log('Fetching agents from 8004scan...');
  
  // Start with a small cohort of agents to ingest & monitor safely
  const listResult = await adapter.listAgents({ limit: 50 });
  if (!listResult.ok) {
    console.error('Failed to list agents from 8004scan:', listResult.detail);
    process.exit(1);
  }

  const discoveredAgents = listResult.data;
  console.log(`Discovered ${discoveredAgents.length} BSC agents from indexer.`);

  // 2. Ingest metadata and services into the database
  const activeServices: typeof services.$inferSelect[] = [];
  const processedAgents: Array<typeof agents.$inferSelect & { servicesList: any[] }> = [];

  for (const agentIdentity of discoveredAgents) {
    console.log(`Ingesting agent ${agentIdentity.id}...`);
    
    // Fetch detailed metadata
    const metadataResult = await adapter.getAgentMetadata(agentIdentity.id);
    if (!metadataResult.ok) {
      console.error(`  Failed to get metadata for ${agentIdentity.id}:`, metadataResult.detail);
      continue;
    }
    
    // Fetch registered services
    const servicesResult = await adapter.getAgentServices(agentIdentity.id);
    if (!servicesResult.ok) {
      console.error(`  Failed to get services for ${agentIdentity.id}:`, servicesResult.detail);
      continue;
    }

    const metadata = metadataResult.data;
    const servicesList = servicesResult.data;

    // Check if agent already exists in db
    const existing = await db.select().from(agents).where(eq(agents.id, agentIdentity.id)).limit(1);
    
    const now = new Date();
    let agentRecord: typeof agents.$inferSelect;

    if (existing.length === 0) {
      // Create new agent record
      const insertRes = await db.insert(agents).values({
        id: agentIdentity.id,
        chain: agentIdentity.chain,
        onchainId: agentIdentity.onchainId,
        registryAddress: agentIdentity.registryAddress ?? null,
        name: metadata.name ?? null,
        description: metadata.description ?? null,
        metadataUri: metadata.metadataUri ?? null,
        metadataResolved: metadata.metadataResolved,
        provenanceSource: metadata.provenance.source,
        provenanceOrigin: metadata.provenance.origin,
        firstSeenAt: now,
        lastIngestedAt: now,
      }).returning();
      agentRecord = insertRes[0]!;
    } else {
      // Update existing agent record
      const updateRes = await db.update(agents).set({
        name: metadata.name ?? null,
        description: metadata.description ?? null,
        metadataUri: metadata.metadataUri ?? null,
        metadataResolved: metadata.metadataResolved,
        provenanceSource: metadata.provenance.source,
        provenanceOrigin: metadata.provenance.origin,
        lastIngestedAt: now,
      }).where(eq(agents.id, agentIdentity.id)).returning();
      agentRecord = updateRes[0]!;
    }

    // Refresh services: delete old services for this agent and insert new ones
    await db.delete(services).where(eq(services.agentId, agentIdentity.id));
    
    for (const service of servicesList) {
      const insertedSvc = await db.insert(services).values({
        id: service.id,
        agentId: service.agentId,
        chain: service.chain,
        declarationForm: service.declarationForm,
        protocol: service.protocol,
        url: service.url,
        provenanceSource: service.provenance.source,
        provenanceOrigin: service.provenance.origin,
        createdAt: now,
      }).returning();
      
      if (insertedSvc[0]) {
        activeServices.push(insertedSvc[0]);
      }
    }

    processedAgents.push({ ...agentRecord, servicesList });
  }

  console.log(`Database ingestion complete. ${processedAgents.length} agents updated, ${activeServices.length} active services registered.`);

  // 3. Perform monitoring probe runs
  const runId = randomUUID();
  console.log(`Starting probe run ${runId}...`);

  await db.insert(probeRuns).values({
    id: runId,
    startedAt: new Date(),
    targetAgentCount: processedAgents.length,
    probeVersion: '0.1.0',
  });

  const rateLimiter = new ProbeRateLimiter({
    globalConcurrency: 10,
    perHostConcurrency: 2,
    minIntervalMsPerHost: 5000,
  });

  const observationPromises: Array<Promise<void>> = [];

  // Probe agent metadata resolution if metadataUri is present
  for (const agent of processedAgents) {
    if (agent.metadataUri) {
      const probeTask = async () => {
        let host = 'unknown';
        try {
          host = new URL(agent.metadataUri!).hostname;
        } catch {
          // If metadataUri is invalid, skip or log
          return;
        }

        if (rateLimiter.isInCooldown(host)) {
          console.log(`  [Skipped] Metadata probe for agent ${agent.id} (host ${host} is in cooldown)`);
          return;
        }

        const release = await rateLimiter.acquire(host);
        try {
          console.log(`  Probing metadata resolution for agent ${agent.id}...`);
          const target: ProbeTarget = {
            agentId: agent.id,
            chain: agent.chain as ChainId,
            url: agent.metadataUri!,
            protocol: 'HTTP',
          };
          const obs = await probeMetadataResolution(target, agent.metadataUri!);
          
          // Record observation
          await db.insert(observations).values({
            id: obs.id,
            probeRunId: runId,
            agentId: obs.agentId,
            chain: obs.chain,
            serviceId: null,
            probeType: obs.probeType,
            timestamp: new Date(obs.timestamp),
            outcome: obs.outcome,
            latencyMs: obs.latencyMs ?? null,
            httpStatus: obs.httpStatus ?? null,
            failureReason: obs.failureReason ?? null,
            provenanceSource: obs.provenance.source,
            provenanceOrigin: obs.provenance.origin,
            probeVersion: obs.probeVersion,
            methodologyVersion: obs.methodologyVersion,
          });

          rateLimiter.recordSuccess(host);
          console.log(`  [Success] Metadata probe for agent ${agent.id} resolved with outcome: ${obs.outcome}`);
        } catch (err: any) {
          rateLimiter.recordFailure(host);
          console.error(`  [Failure] Metadata probe for agent ${agent.id}:`, err.message);
        } finally {
          release();
        }
      };

      observationPromises.push(probeTask());
    }
  }

  // Probe services
  for (const service of activeServices) {
    const probeTask = async () => {
      let host = 'unknown';
      try {
        host = new URL(service.url).hostname;
      } catch {
        return;
      }

      if (rateLimiter.isInCooldown(host)) {
        console.log(`  [Skipped] Service ${service.id} (${service.url}) (host ${host} is in cooldown)`);
        return;
      }

      const release = await rateLimiter.acquire(host);
      try {
        console.log(`  Probing service ${service.id} (${service.url})...`);
        const target: ProbeTarget = {
          agentId: service.agentId,
          chain: service.chain as ChainId,
          serviceId: service.id,
          url: service.url,
          protocol: service.protocol as ServiceProtocol,
        };

        // Run the suite of probes required for each service
        const reachability = await probeServiceReachability(target);
        const status = await probeHttpStatus(target);
        const latency = await probeResponseLatency(target);
        const protocolVal = await probeProtocolResponseValidity(target);

        const allObs = [reachability, status, latency, protocolVal];

        for (const obs of allObs) {
          await db.insert(observations).values({
            id: obs.id,
            probeRunId: runId,
            agentId: obs.agentId,
            chain: obs.chain,
            serviceId: obs.serviceId ?? null,
            probeType: obs.probeType,
            timestamp: new Date(obs.timestamp),
            outcome: obs.outcome,
            latencyMs: obs.latencyMs ?? null,
            httpStatus: obs.httpStatus ?? null,
            failureReason: obs.failureReason ?? null,
            provenanceSource: obs.provenance.source,
            provenanceOrigin: obs.provenance.origin,
            probeVersion: obs.probeVersion,
            methodologyVersion: obs.methodologyVersion,
          });
        }

        rateLimiter.recordSuccess(host);
        console.log(`  [Success] Service ${service.id} probed. Reachability outcome: ${reachability.outcome}`);
      } catch (err: any) {
        rateLimiter.recordFailure(host);
        console.error(`  [Failure] Service ${service.id}:`, err.message);
      } finally {
        release();
      }
    };

    observationPromises.push(probeTask());
  }

  // Wait for all monitoring actions to complete
  await Promise.all(observationPromises);

  // Update probeRun completion time
  await db.update(probeRuns).set({
    finishedAt: new Date(),
  }).where(eq(probeRuns.id, runId));

  console.log(`--- Probe Run ${runId} Complete ---`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Unhandled run error:', err);
  process.exit(1);
});
