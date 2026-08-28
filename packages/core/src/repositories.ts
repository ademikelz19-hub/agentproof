/**
 * Repository abstractions (build prompt Phase D, section 4).
 *
 * Reliability and reputation-integrity calculations depend ONLY on these
 * interfaces, never on Drizzle or any specific database client directly.
 * This is what makes the calculation engines unit-testable with in-memory
 * fakes (see packages/reliability and packages/reputation tests) and keeps
 * the door open to swapping the underlying store later without touching
 * calculation logic.
 *
 * Deliberately NOT one interface per table — `ObservationRepository` covers
 * both reads and the single trusted write path, `AgentRepository` covers
 * agents+services together since they're always read together for a
 * Passport. Over-abstracting every table into its own repository was
 * explicitly discouraged by the build prompt.
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

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

export interface AgentRepository {
  listAgents(opts: { chain?: ChainId; limit: number; cursor?: string }): Promise<Page<AgentIdentity>>;
  getAgent(chain: ChainId, agentId: string): Promise<AgentIdentity | null>;
  getMetadata(agentId: string): Promise<AgentMetadata | null>;
  getServices(agentId: string): Promise<AgentService[]>;
}

export interface ObservationRepository {
  /**
   * The only write path into observation history. Implementations must
   * follow an application-level append-only evidence architecture: this
   * method INSERTs; it never updates or deletes an existing row. This is
   * enforced by the absence of any update/delete method on this interface —
   * not by a database-level constraint (no such constraint exists yet; see
   * docs/ARCHITECTURE.md "Append-only enforcement level"). Only trusted
   * probe-execution code may call this — never exposed behind a public API
   * route (see docs/SECURITY_MODEL.md).
   */
  recordObservation(observation: ProbeObservation): Promise<void>;

  /** All observations for an agent (optionally scoped to one service) within [since, until]. Used to feed the reliability engine — the engine itself does no I/O. */
  listObservations(opts: {
    agentId: string;
    serviceId?: string;
    since: string;
    until: string;
    limit: number;
    cursor?: string;
  }): Promise<Page<ProbeObservation>>;
}

/**
 * Result of a feedback lookup. `status` MUST be checked before touching
 * `records` — a `NOT_INGESTED`/`UPSTREAM_UNAVAILABLE`/`UNSUPPORTED` status
 * with an empty `records` array means "we don't know," not "there are
 * zero." See docs/REPUTATION_INTEGRITY.md "Feedback availability semantics".
 */
export interface FeedbackQueryResult {
  status: FeedbackAvailability;
  /** Only meaningful when status === 'AVAILABLE'. Empty for every other status — never populated as a stand-in for "we don't know." */
  records: FeedbackRecord[];
}

export interface ReputationRepository {
  listFeedback(agentId: string): Promise<FeedbackQueryResult>;
  recordReputationEvidence(evidence: ReputationEvidence): Promise<void>;
  recordIntegritySignals(signals: IntegritySignal[]): Promise<void>;
}
