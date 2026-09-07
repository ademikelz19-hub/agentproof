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
import { eq, sql } from 'drizzle-orm';
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
  
  // Fetch the newest cohort from 8004scan (20 latest agents for continuous discovery)
  const listResult = await adapter.listAgents({ limit: 20 });
  const liveAgents = listResult.ok ? listResult.data : [];
  if (!listResult.ok) {
    console.warn(`[Warning] 8004scan live discovery temporarily unavailable (${listResult.detail}). Proceeding with database rotation cohort.`);
  }

  // Merge priority anchors + live-discovered agents (deduplicated by id)
  const discoveredSet = new Map(liveAgents.map((a) => [a.id, a]));
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

  // 2b. Pull rotation cohort from existing database:
  // Find agents with declared services that haven't been probed recently, or have fewest observations.
  // This guarantees that all 900+ agents in the database accumulate continuous evidence rather than staying at 1 test.
  console.log('Querying rotation cohort from database...');
  const rotationRows = await db.execute(sql`
    SELECT
      a.id,
      a.chain,
      a.onchain_id AS "onchainId",
      a.registry_address AS "registryAddress",
      a.name,
      a.description,
      a.metadata_uri AS "metadataUri",
      a.metadata_resolved AS "metadataResolved",
      a.provenance_source AS "provenanceSource",
      a.provenance_origin AS "provenanceOrigin",
      a.first_seen_at AS "firstSeenAt",
      a.last_ingested_at AS "lastIngestedAt",
      (
        SELECT json_agg(json_build_object(
          'id', s.id,
          'agentId', s.agent_id,
          'chain', s.chain,
          'declarationForm', s.declaration_form,
          'protocol', s.protocol,
          'url', s.url,
          'provenanceSource', s.provenance_source,
          'provenanceOrigin', s.provenance_origin,
          'createdAt', s.created_at
        ))
        FROM services s
        WHERE s.agent_id = a.id
      ) AS "servicesList",
      COALESCE(
        (SELECT MAX(o.timestamp) FROM observations o WHERE o.agent_id = a.id),
        '1970-01-01'::timestamptz
      ) AS "lastProbedAt",
      (SELECT COUNT(*)::int FROM observations o WHERE o.agent_id = a.id) AS "obsCount"
    FROM agents a
    WHERE EXISTS (SELECT 1 FROM services s WHERE s.agent_id = a.id)
    ORDER BY "obsCount" ASC, "lastProbedAt" ASC
    LIMIT 40
  `);

  const existingAgentIds = new Set(processedAgents.map((a) => a.id));
  const existingServiceIds = new Set(activeServices.map((s) => s.id));

  for (const row of rotationRows.rows as any[]) {
    if (!existingAgentIds.has(row.id)) {
      existingAgentIds.add(row.id);
      const svcList = Array.isArray(row.servicesList) ? row.servicesList : [];
      processedAgents.push({
        id: row.id,
        chain: row.chain,
        onchainId: row.onchainId,
        registryAddress: row.registryAddress,
        name: row.name,
        description: row.description,
        metadataUri: row.metadataUri,
        metadataResolved: row.metadataResolved,
        provenanceSource: row.provenanceSource,
        provenanceOrigin: row.provenanceOrigin,
        firstSeenAt: new Date(row.firstSeenAt),
        lastIngestedAt: new Date(row.lastIngestedAt),
        servicesList: svcList,
      });

      for (const svc of svcList) {
        if (!existingServiceIds.has(svc.id)) {
          existingServiceIds.add(svc.id);
          activeServices.push({
            id: svc.id,
            agentId: svc.agentId,
            chain: svc.chain,
            declarationForm: svc.declarationForm,
            protocol: svc.protocol,
            url: svc.url,
            provenanceSource: svc.provenanceSource,
            provenanceOrigin: svc.provenanceOrigin,
            createdAt: new Date(svc.createdAt),
          });
        }
      }
    }
  }

  console.log(`Final monitoring cohort assembled: ${processedAgents.length} agents, ${activeServices.length} services to probe.`);

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
