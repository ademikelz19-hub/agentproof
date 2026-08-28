/**
 * In-memory implementations of the repository interfaces.
 *
 * Two uses:
 *  1. Unit-testing anything that depends on a repository (API route
 *     handlers, future services) without a real database.
 *  2. Serving as the default, honestly-empty store for the deployed app
 *     until a real Postgres instance is wired up (Phase D says "do not
 *     require a live paid database to complete this phase" — this is how
 *     the API/UI can exist and run now without either requiring a live DB
 *     or fabricating data: an empty in-memory store returns real empty
 *     results, never synthetic ones).
 */

import type {
  AgentIdentity,
  AgentMetadata,
  AgentService,
  ChainId,
  FeedbackAvailability,
  FeedbackRecord,
  IntegritySignal,
  ProbeObservation,
  ReputationEvidence,
} from './domain';
import type {
  AgentRepository,
  FeedbackQueryResult,
  ObservationRepository,
  Page,
  ReputationRepository,
} from './repositories';

function paginate<T>(items: T[], limit: number, cursor: string | undefined, keyOf: (t: T) => string): Page<T> {
  const startIndex = cursor ? items.findIndex((i) => keyOf(i) === cursor) + 1 : 0;
  const slice = items.slice(startIndex, startIndex + limit);
  const nextCursor =
    startIndex + limit < items.length ? keyOf(items[startIndex + limit - 1] as T) : undefined;
  return { items: slice, ...(nextCursor ? { nextCursor } : {}) };
}

export class InMemoryAgentRepository implements AgentRepository {
  constructor(
    private readonly agents: AgentIdentity[] = [],
    private readonly metadata: Map<string, AgentMetadata> = new Map(),
    private readonly services: Map<string, AgentService[]> = new Map(),
  ) {}

  async listAgents(opts: { chain?: ChainId; limit: number; cursor?: string }): Promise<Page<AgentIdentity>> {
    const filtered = opts.chain ? this.agents.filter((a) => a.chain === opts.chain) : this.agents;
    return paginate(filtered, opts.limit, opts.cursor, (a) => a.id);
  }

  async getAgent(chain: ChainId, agentId: string): Promise<AgentIdentity | null> {
    return this.agents.find((a) => a.chain === chain && a.id === agentId) ?? null;
  }

  async getMetadata(agentId: string): Promise<AgentMetadata | null> {
    return this.metadata.get(agentId) ?? null;
  }

  async getServices(agentId: string): Promise<AgentService[]> {
    return this.services.get(agentId) ?? [];
  }
}

export class InMemoryObservationRepository implements ObservationRepository {
  private readonly observations: ProbeObservation[] = [];

  constructor(seed: ProbeObservation[] = []) {
    this.observations.push(...seed);
  }

  async recordObservation(observation: ProbeObservation): Promise<void> {
    // Append-only: push, never mutate/replace an existing entry.
    this.observations.push(observation);
  }

  async listObservations(opts: {
    agentId: string;
    serviceId?: string;
    since: string;
    until: string;
    limit: number;
    cursor?: string;
  }): Promise<Page<ProbeObservation>> {
    const sinceMs = new Date(opts.since).getTime();
    const untilMs = new Date(opts.until).getTime();
    const filtered = this.observations
      .filter((o) => o.agentId === opts.agentId)
      .filter((o) => !opts.serviceId || o.serviceId === opts.serviceId)
      .filter((o) => {
        const t = new Date(o.timestamp).getTime();
        return t >= sinceMs && t <= untilMs;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return paginate(filtered, opts.limit, opts.cursor, (o) => o.id);
  }
}

export class InMemoryReputationRepository implements ReputationRepository {
  private readonly feedback: FeedbackRecord[] = [];
  private readonly evidence: ReputationEvidence[] = [];
  private readonly signals: IntegritySignal[] = [];
  private readonly availability: FeedbackAvailability;

  /**
   * `availability` defaults to `NOT_INGESTED` — the honest default for an
   * empty store where no feedback pipeline has actually run (this is what
   * the deployed app wires up until real ingestion exists). Tests that
   * want to exercise the "genuinely zero records" case must pass
   * `availability: 'AVAILABLE'` explicitly alongside an empty
   * `seedFeedback` array — the two must never be conflated by a shared
   * default.
   */
  constructor(seedFeedback: FeedbackRecord[] = [], availability: FeedbackAvailability = 'NOT_INGESTED') {
    this.feedback.push(...seedFeedback);
    this.availability = availability;
  }

  async listFeedback(agentId: string): Promise<FeedbackQueryResult> {
    if (this.availability !== 'AVAILABLE') {
      return { status: this.availability, records: [] };
    }
    return { status: 'AVAILABLE', records: this.feedback.filter((f) => f.agentId === agentId) };
  }

  async recordReputationEvidence(evidence: ReputationEvidence): Promise<void> {
    this.evidence.push(evidence);
  }

  async recordIntegritySignals(signals: IntegritySignal[]): Promise<void> {
    this.signals.push(...signals);
  }
}
