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

/**
 * Priority cohort — well-known agents guaranteed to be included in every
 * monitoring run regardless of what the live API paginates. These agents
 * have real human reviews on 8004scan and serve as credibility anchors.
 */
const PRIORITY_AGENT_IDS: string[] = [
  'bsc:2142',   // @heyibinance · Ensoul (6 reviews)
  'bsc:2518',   // @pancakeswap · Ensoul (6 reviews)
  'bsc:31032',  // @evilcos · Ensoul (6 reviews)
  'bsc:31039',  // @blknoiz06 · Ensoul (6 reviews)
  'bsc:2383',   // @realDonaldTrump · Ensoul (3 reviews)
  'bsc:49637',  // OpenOdds.Ai (3 reviews)
  'bsc:2387',   // @sibeleth · Ensoul (6 reviews)
];

async function run() {
  console.log('--- Starting AgentProof Ingestion & Monitoring Run ---');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment or .env.local');
  }

  // 1. Initialize 8004scan Adapter
  const adapter = new EightOFourScanAdapter();
  console.log('Fetching agents from 8004scan...');
  
  // Fetch the newest cohort from 8004scan
  const listResult = await adapter.listAgents({ limit: 50 });
  if (!listResult.ok) {
    console.error('Failed to list agents from 8004scan:', listResult.detail);
    process.exit(1);
  }

  // Merge priority anchors + live-discovered agents (deduplicated by id)
  const discoveredSet = new Map(listResult.data.map((a) => [a.id, a]));
  for (const priorityId of PRIORITY_AGENT_IDS) {
    if (!discoveredSet.has(priorityId)) {
      const tokenId = priorityId.split(':')[1]!;
      discoveredSet.set(priorityId, {
        id: priorityId,
        chain: BSC.id,
        onchainId: tokenId,
        registryAddress: '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',
        provenance: {
          source: 'INDEXER' as const,
          origin: '8004scan-priority-cohort',
          observedAt: new Date().toISOString(),
        },
      });
    }
  }
  const discoveredAgents = Array.from(discoveredSet.values());
  console.log(`Discovered ${discoveredAgents.length} BSC agents (${PRIORITY_AGENT_IDS.length} priority + live cohort).`);

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

  // Metrics tracking
  let observationsWritten = 0;
  let successfulProbes = 0;
  let attributableFailures = 0;
  let internalFailures = 0;
  let skippedTargets = 0;
  const startTime = Date.now();
  const observationPromises: Array<Promise<void>> = [];

  // Probe agent metadata resolution if metadataUri is present
  for (const agent of processedAgents) {
    if (agent.metadataUri) {
      const probeTask = async () => {
        let host = 'unknown';
        try {
          host = new URL(agent.metadataUri!).hostname;
        } catch {
          return;
        }

        if (rateLimiter.isInCooldown(host)) {
          skippedTargets++;
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
          observationsWritten++;

          if (obs.outcome === 'SUCCESS') {
            successfulProbes++;
            rateLimiter.recordSuccess(host);
          } else {
            attributableFailures++;
            rateLimiter.recordFailure(host);
          }
          console.log(`  [${obs.outcome}] Metadata probe for agent ${agent.id}`);
        } catch (err: any) {
          internalFailures++;
          rateLimiter.recordFailure(host);
          console.error(`  [Internal Error] Metadata probe for agent ${agent.id}:`, err.message);
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
        skippedTargets++;
        console.log(`  [Skipped] Service ${service.id} (host ${host} is in cooldown)`);
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
          observationsWritten++;
          if (obs.outcome === 'SUCCESS') successfulProbes++;
          else attributableFailures++;
        }

        if (reachability.outcome === 'SUCCESS') {
          rateLimiter.recordSuccess(host);
        } else {
          rateLimiter.recordFailure(host);
        }
        console.log(`  [${reachability.outcome}] Service ${service.id} probed.`);
      } catch (err: any) {
        internalFailures++;
        rateLimiter.recordFailure(host);
        console.error(`  [Internal Error] Service ${service.id}:`, err.message);
      } finally {
        release();
      }
    };

    observationPromises.push(probeTask());
  }

  // Wait for all monitoring actions to complete
  await Promise.all(observationPromises);

  const finishedAt = new Date();
  const durationMs = Date.now() - startTime;

  // Update probeRun completion time
  await db.update(probeRuns).set({
    finishedAt,
  }).where(eq(probeRuns.id, runId));

  console.log('\n================ PROBE RUN SUMMARY ================');
  console.log(`  Run ID:                ${runId}`);
  console.log(`  Agents Attempted:      ${processedAgents.length}`);
  console.log(`  Services Attempted:    ${activeServices.length}`);
  console.log(`  Observations Written:  ${observationsWritten}`);
  console.log(`  Successful Probes:     ${successfulProbes}`);
  console.log(`  Attributable Failures: ${attributableFailures}`);
  console.log(`  Skipped (Cooldown):    ${skippedTargets}`);
  console.log(`  Internal Failures:     ${internalFailures}`);
  console.log(`  Duration:              ${(durationMs / 1000).toFixed(2)}s`);
  console.log(`  Finished At:           ${finishedAt.toISOString()}`);
  console.log('====================================================\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('Unhandled run error:', err);
  process.exit(1);
});
