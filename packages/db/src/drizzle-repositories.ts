/**
 * Drizzle-backed implementations of @agentproof/core's repository
 * interfaces.
 *
 * STATUS: UNVERIFIED. This sandbox has no Postgres instance (Phase D
 * explicitly does not require one to complete this phase — see
 * docs/ENVIRONMENT_BASELINE.md). This code has never been executed against
 * a real database. It typechecks against the schema in `schema.ts` and is
 * structurally what the interfaces require, but treat it as a drop-in
 * skeleton to verify — not a tested integration — once a real Postgres
 * connection (Neon/Supabase free tier) is available.
 *
 * The app does NOT use this yet — see apps/web's repository wiring, which
 * uses the honestly-empty in-memory repositories from @agentproof/core
 * until this has been verified against a real database.
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
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.agents.id))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    const page = rows.slice(0, opts.limit);
    const lastId = page[page.length - 1]?.id;
    return {
      items: page.map(rowToAgentIdentity),
      ...(hasMore && lastId ? { nextCursor: lastId } : {}),
    };
  }

  async getAgent(chain: ChainId, agentId: string): Promise<AgentIdentity | null> {
    const normalized = normalizeAgentId(agentId, chain);
    const bareOnchainId: string = (normalized.includes(':') ? normalized.split(':')[1] : normalized) || normalized;
    const [row] = await this.db
      .select()
      .from(schema.agents)
      .where(
        and(
          eq(schema.agents.chain, chain),
          or(eq(schema.agents.id, normalized), eq(schema.agents.onchainId, bareOnchainId))
        )
      )
      .limit(1);
    return row ? rowToAgentIdentity(row) : null;
  }

  async getMetadata(agentId: string): Promise<AgentMetadata | null> {
    const normalized = normalizeAgentId(agentId);
    const bareOnchainId: string = (normalized.includes(':') ? normalized.split(':')[1] : normalized) || normalized;
    const [row] = await this.db
      .select()
      .from(schema.agents)
      .where(or(eq(schema.agents.id, normalized), eq(schema.agents.onchainId, bareOnchainId)))
      .limit(1);
    if (!row) return null;
    const observedAt = row.lastIngestedAt ? new Date(row.lastIngestedAt).toISOString() : new Date().toISOString();
    return {
      agentId: row.id,
      ...(row.name ? { name: row.name } : {}),
      ...(row.description ? { description: row.description } : {}),
      ...(row.metadataUri ? { metadataUri: row.metadataUri } : {}),
      metadataResolved: row.metadataResolved,
      provenance: {
        source: row.provenanceSource as AgentMetadata['provenance']['source'],
        origin: row.provenanceOrigin,
        observedAt,
      },
    };
  }

  async getServices(agentId: string): Promise<AgentService[]> {
    const normalized = normalizeAgentId(agentId);
    const rows = await this.db.select().from(schema.services).where(eq(schema.services.agentId, normalized));
    return rows.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      chain: r.chain as ChainId,
      declarationForm: r.declarationForm as AgentService['declarationForm'],
      protocol: r.protocol as AgentService['protocol'],
      url: r.url,
      provenance: {
        source: r.provenanceSource as AgentService['provenance']['source'],
        origin: r.provenanceOrigin,
        observedAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      },
    }));
  }
}

function rowToAgentIdentity(row: typeof schema.agents.$inferSelect): AgentIdentity {
  const observedAt = row.lastIngestedAt ? new Date(row.lastIngestedAt).toISOString() : new Date().toISOString();
  return {
    id: row.id,
    chain: row.chain as ChainId,
    onchainId: row.onchainId,
    ...(row.registryAddress ? { registryAddress: row.registryAddress } : {}),
    provenance: {
      source: row.provenanceSource as AgentIdentity['provenance']['source'],
      origin: row.provenanceOrigin,
      observedAt,
    },
  };
}

export class DrizzleObservationRepository implements ObservationRepository {
  constructor(private readonly db: AnyDb) {}

  /** The only write path — INSERT only, per the application-level append-only evidence architecture (docs/ARCHITECTURE.md); no database-level enforcement exists yet. */
  async recordObservation(observation: ProbeObservation): Promise<void> {
    await this.db.insert(schema.observations).values({
      id: observation.id,
      agentId: observation.agentId,
      chain: observation.chain,
      serviceId: observation.serviceId ?? null,
      probeType: observation.probeType,
      timestamp: new Date(observation.timestamp),
      outcome: observation.outcome,
      latencyMs: observation.latencyMs ?? null,
      httpStatus: observation.httpStatus ?? null,
      failureReason: observation.failureReason ?? null,
      provenanceSource: observation.provenance.source,
      provenanceOrigin: observation.provenance.origin,
      probeVersion: observation.probeVersion,
      methodologyVersion: observation.methodologyVersion,
    });
  }

  async listObservations(opts: {
    agentId: string;
    serviceId?: string;
    since: string;
    until: string;
    limit: number;
    cursor?: string;
  }): Promise<Page<ProbeObservation>> {
    const normalized = normalizeAgentId(opts.agentId);
    const conditions = [
      eq(schema.observations.agentId, normalized),
      opts.serviceId ? eq(schema.observations.serviceId, opts.serviceId) : undefined,
      gte(schema.observations.timestamp, new Date(opts.since)),
      lte(schema.observations.timestamp, new Date(opts.until)),
      opts.cursor ? lt(schema.observations.id, opts.cursor) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const rows = await this.db
      .select()
      .from(schema.observations)
      .where(and(...conditions))
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

export class DrizzleReputationRepository implements ReputationRepository {
  constructor(private readonly db: AnyDb) {}

  /**
   * Fetches live feedback for this agent from the 8004scan /feedbacks endpoint.
   *
   * agentId is in AgentProof format "bsc:<tokenId>" — we extract the numeric
   * tokenId and query: GET /feedbacks?chainId=56&tokenId=<id>
   *
   * Returns:
   *   AVAILABLE            — fetch succeeded (zero or more records)
   *   UPSTREAM_UNAVAILABLE — fetch failed (network error, non-2xx, parse error)
   *   NOT_INGESTED         — agentId format unrecognised (can't derive tokenId)
   *
   * See docs/REPUTATION_INTEGRITY.md "Feedback availability semantics".
   */
  async listFeedback(agentId: string): Promise<FeedbackQueryResult> {
    const normalized = normalizeAgentId(agentId);
    // Extract numeric tokenId from "bsc:12345" format
    const match = /^bsc:(\d+)$/.exec(normalized);
    if (!match) {
      return { status: 'NOT_INGESTED', records: [] };
    }
    const tokenId = match[1];
    const apiKey = process.env['EIGHT004SCAN_API_KEY'] ?? process.env['EIGHT_O_FOUR_API_KEY'];
    if (!apiKey) {
      return { status: 'UPSTREAM_UNAVAILABLE', records: [] };
    }

    // NOTE: The 8004scan /feedbacks endpoint ignores the tokenId query parameter
    // and returns platform-wide global feedback. We fetch a larger page and filter
    // client-side by the agent's token_id embedded in the feedback records.
    const url = `https://8004scan.io/api/v1/public/feedbacks?chainId=56&limit=500`;

    try {
      const res = await fetch(url, { headers: { 'X-API-Key': apiKey } });
      if (!res.ok) return { status: 'UPSTREAM_UNAVAILABLE', records: [] };

      const body = (await res.json()) as {
        success: boolean;
        data?: Array<{
          user_address?: string;
          submitted_at?: string;
          agent?: { token_id?: string };
        }>;
      };
      if (!body.success || !Array.isArray(body.data)) {
        return { status: 'UPSTREAM_UNAVAILABLE', records: [] };
      }

      // Filter to only this agent's feedback records
      const agentRecords = body.data.filter(
        (r) => r.agent?.token_id === tokenId
      );

      // If no agent-specific records found, return NOT_INGESTED rather than
      // falsely reporting 0 reviews (the agent may simply have no reviews yet)
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
          origin: url,
          observedAt,
        },
      }));

      return { status: 'AVAILABLE', records };
    } catch {
      return { status: 'UPSTREAM_UNAVAILABLE', records: [] };
    }
  }

  async recordReputationEvidence(evidence: ReputationEvidence): Promise<void> {
    if (evidence.feedbackAvailability !== 'AVAILABLE') {
      // Nothing to persist as a "snapshot" when there was no analyzed
      // dataset — recording a zeroed-out row here would recreate exactly
      // the NOT_INGESTED-vs-zero ambiguity this refactor exists to avoid.
      // A future schema change may add an explicit
      // `feedback_availability` column to `reputation_snapshots` if
      // recording non-AVAILABLE states becomes useful; not needed yet.
      return;
    }
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
