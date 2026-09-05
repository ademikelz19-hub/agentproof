/**
 * Drizzle-backed implementations of @agentproof/core's repository interfaces.
 */

import { randomUUID } from 'node:crypto';
import { and, desc, eq, gte, lte, lt, or } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type {
  AgentIdentity,
  AgentMetadata,
  AgentRepository,
  AgentService,
  ChainId,
  FeedbackQueryResult,
  FeedbackRecord,
  IntegritySignal,
  ObservationRepository,
  Page,
  ProbeObservation,
  ReputationEvidence,
  ReputationRepository,
  ServiceProtocol,
} from '@agentproof/core';
import * as schema from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = PgDatabase<any, typeof schema, any>;

function normalizeAgentId(rawId: string, chain: string = 'bsc'): string {
  try {
    const decoded = decodeURIComponent(rawId).trim();
    if (decoded.includes(':')) return decoded;
    return `${chain}:${decoded}`;
  } catch {
    return rawId.trim();
  }
}

export class DrizzleAgentRepository implements AgentRepository {
  constructor(private readonly db: AnyDb) {}

  async listAgents(opts: { chain?: ChainId; limit: number; cursor?: string }): Promise<Page<AgentIdentity>> {
    const conditions = [
      opts.chain ? eq(schema.agents.chain, opts.chain) : undefined,
      opts.cursor ? lt(schema.agents.id, opts.cursor) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const rows = await this.db
      .select()
      .from(schema.agents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.agents.id))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    const page = rows.slice(0, opts.limit);
    const lastId = page[page.length - 1]?.id;

    return {
      items: page.map((r) => ({
        id: r.id,
        chain: r.chain as ChainId,
        onchainId: r.onchainId,
        ...(r.registryAddress ? { registryAddress: r.registryAddress } : {}),
        provenance: {
          source: r.provenanceSource as AgentIdentity['provenance']['source'],
          origin: r.provenanceOrigin,
          observedAt: r.lastIngestedAt ? new Date(r.lastIngestedAt).toISOString() : new Date().toISOString(),
        },
      })),
      ...(hasMore && lastId ? { nextCursor: lastId } : {}),
    };
  }

  async getAgent(chain: ChainId, id: string): Promise<AgentIdentity | null> {
    const normalized = normalizeAgentId(id, chain);
    const [row] = await this.db
      .select()
      .from(schema.agents)
      .where(
        or(
          and(eq(schema.agents.chain, chain), eq(schema.agents.id, normalized)),
          and(eq(schema.agents.chain, chain), eq(schema.agents.onchainId, id)),
          and(eq(schema.agents.chain, chain), eq(schema.agents.id, id))
        )
      )
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      chain: row.chain as ChainId,
      onchainId: row.onchainId,
      ...(row.registryAddress ? { registryAddress: row.registryAddress } : {}),
      provenance: {
        source: row.provenanceSource as AgentIdentity['provenance']['source'],
        origin: row.provenanceOrigin,
        observedAt: row.lastIngestedAt ? new Date(row.lastIngestedAt).toISOString() : new Date().toISOString(),
      },
    };
  }

  async getMetadata(agentId: string): Promise<AgentMetadata | null> {
    const normalized = normalizeAgentId(agentId);
    const [row] = await this.db
      .select()
      .from(schema.agents)
      .where(or(eq(schema.agents.id, normalized), eq(schema.agents.id, agentId)))
      .limit(1);

    if (!row) return null;

    return {
      agentId: row.id,
      ...(row.name ? { name: row.name } : {}),
      ...(row.description ? { description: row.description } : {}),
      ...(row.metadataUri ? { metadataUri: row.metadataUri } : {}),
      metadataResolved: row.metadataResolved,
      provenance: {
        source: row.provenanceSource as AgentMetadata['provenance']['source'],
        origin: row.provenanceOrigin,
        observedAt: row.lastIngestedAt ? new Date(row.lastIngestedAt).toISOString() : new Date().toISOString(),
      },
    };
  }

  async getServices(agentId: string): Promise<AgentService[]> {
    const normalized = normalizeAgentId(agentId);
    const rows = await this.db
      .select()
      .from(schema.services)
      .where(or(eq(schema.services.agentId, normalized), eq(schema.services.agentId, agentId)));

    return rows.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      chain: 'bsc' as ChainId,
      protocol: r.protocol as ServiceProtocol,
      url: r.url,
      declarationForm: r.declarationForm as AgentService['declarationForm'],
      provenance: {
        source: r.provenanceSource as AgentService['provenance']['source'],
        origin: r.provenanceOrigin,
        observedAt: new Date().toISOString(),
      },
    }));
  }
}

export class DrizzleObservationRepository implements ObservationRepository {
  constructor(private readonly db: AnyDb) {}

  async listObservations(opts: {
    agentId?: string;
    chain?: ChainId;
    serviceId?: string;
    since?: string;
    until?: string;
    limit: number;
    cursor?: string;
  }): Promise<Page<ProbeObservation>> {
    const conditions = [];

    if (opts.agentId) {
      const normalized = normalizeAgentId(opts.agentId);
      conditions.push(or(eq(schema.observations.agentId, normalized), eq(schema.observations.agentId, opts.agentId)));
    }
    if (opts.chain) {
      conditions.push(eq(schema.observations.chain, opts.chain));
    }
    if (opts.serviceId) {
      conditions.push(eq(schema.observations.serviceId, opts.serviceId));
    }
    if (opts.since) {
      conditions.push(gte(schema.observations.timestamp, new Date(opts.since)));
    }
    if (opts.until) {
      conditions.push(lte(schema.observations.timestamp, new Date(opts.until)));
    }
    if (opts.cursor) {
      conditions.push(lt(schema.observations.id, opts.cursor));
    }

    const rows = await this.db
      .select()
      .from(schema.observations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.observations.timestamp))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    const page = rows.slice(0, opts.limit);
    const lastId = page[page.length - 1]?.id;
    return {
      items: page.map(rowToObservation),
      ...(hasMore && lastId ? { nextCursor: lastId } : {}),
    };
  }

  async recordObservation(obs: ProbeObservation): Promise<void> {
    await this.db.insert(schema.observations).values({
      id: obs.id,
      probeRunId: null,
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
}

function rowToObservation(row: typeof schema.observations.$inferSelect): ProbeObservation {
  const timestampStr = row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString();
  return {
    id: row.id,
    agentId: row.agentId,
    chain: row.chain as ChainId,
    ...(row.serviceId ? { serviceId: row.serviceId } : {}),
    probeType: row.probeType as ProbeObservation['probeType'],
    timestamp: timestampStr,
    outcome: row.outcome as ProbeObservation['outcome'],
    ...(row.latencyMs !== null ? { latencyMs: row.latencyMs } : {}),
    ...(row.httpStatus !== null ? { httpStatus: row.httpStatus } : {}),
    ...(row.failureReason ? { failureReason: row.failureReason } : {}),
    provenance: {
      source: row.provenanceSource as ProbeObservation['provenance']['source'],
      origin: row.provenanceOrigin,
      observedAt: timestampStr,
    },
    probeVersion: row.probeVersion,
    methodologyVersion: row.methodologyVersion,
  };
}

// In-memory cache for 8004scan global feedback to ensure instant response times
interface CachedFeedbacks {
  data: Array<{
    user_address?: string;
    submitted_at?: string;
    agent?: { token_id?: string };
  }>;
  fetchedAt: number;
}
let feedbackCache: CachedFeedbacks | null = null;
const FEEDBACK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class DrizzleReputationRepository implements ReputationRepository {
  constructor(private readonly db: AnyDb) {}

  async listFeedback(agentId: string): Promise<FeedbackQueryResult> {
    const normalized = normalizeAgentId(agentId);
    const match = /^bsc:(\d+)$/.exec(normalized);
    if (!match) {
      return { status: 'NOT_INGESTED', records: [] };
    }
    const tokenId = match[1];
    const apiKey = process.env['EIGHT004SCAN_API_KEY'] ?? process.env['EIGHT_O_FOUR_API_KEY'];
    if (!apiKey) {
      return { status: 'UPSTREAM_UNAVAILABLE', records: [] };
    }

    const now = Date.now();
    let rawFeedbackData = feedbackCache?.data;

    if (!feedbackCache || now - feedbackCache.fetchedAt > FEEDBACK_CACHE_TTL) {
      const url = `https://8004scan.io/api/v1/public/feedbacks?chainId=56&limit=500`;
      try {
        const res = await fetch(url, {
          headers: { 'X-API-Key': apiKey },
          signal: AbortSignal.timeout(1500), // Strict 1.5s timeout so page loads are never delayed
        });

        if (res.ok) {
          const body = (await res.json()) as {
            success: boolean;
            data?: Array<{
              user_address?: string;
              submitted_at?: string;
              agent?: { token_id?: string };
            }>;
          };
          if (body.success && Array.isArray(body.data)) {
            feedbackCache = {
              data: body.data,
              fetchedAt: now,
            };
            rawFeedbackData = body.data;
          }
        }
      } catch {
        // If network timed out or failed, fall back to existing cache if available
        rawFeedbackData = feedbackCache?.data;
      }
    }

    if (!rawFeedbackData) {
      return { status: 'NOT_INGESTED', records: [] };
    }

    // Filter to only this agent's feedback records
    const agentRecords = rawFeedbackData.filter((r) => r.agent?.token_id === tokenId);

    if (agentRecords.length === 0) {
      return { status: 'NOT_INGESTED', records: [] };
    }

    const observedAt = new Date().toISOString();
    const records: FeedbackRecord[] = agentRecords.map((raw) => ({
      agentId,
      reviewerId: raw.user_address ?? 'unknown',
      timestamp: raw.submitted_at ?? observedAt,
      provenance: {
        source: 'INDEXER' as const,
        origin: 'https://8004scan.io',
        observedAt,
      },
    }));

    return { status: 'AVAILABLE', records };
  }

  async recordReputationEvidence(evidence: ReputationEvidence): Promise<void> {
    if (evidence.feedbackAvailability !== 'AVAILABLE') return;
    await this.db.insert(schema.reputationSnapshots).values({
      id: randomUUID(),
      agentId: evidence.agentId,
      feedbackCount: evidence.feedbackCount,
      uniqueReviewerCount: evidence.uniqueReviewerCount,
      reviewerConcentration: evidence.reviewerConcentration ?? null,
      repeatReviewConcentration: evidence.repeatReviewConcentration ?? null,
      methodologyVersion: evidence.methodologyVersion,
      computedAt: new Date(evidence.computedAt),
      provenanceSource: evidence.provenance.source,
      provenanceOrigin: evidence.provenance.origin,
    });
  }

  async recordIntegritySignals(signals: IntegritySignal[]): Promise<void> {
    if (signals.length === 0) return;
    await this.db.insert(schema.integritySignals).values(
      signals.map((s) => ({
        id: s.id,
        agentId: s.agentId,
        signalType: s.signalType,
        description: s.description,
        detectedAt: new Date(s.detectedAt),
        methodologyVersion: s.methodologyVersion,
        provenanceSource: s.provenance.source,
        provenanceOrigin: s.provenance.origin,
      })),
    );
  }
}
