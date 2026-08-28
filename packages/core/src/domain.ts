/**
 * AgentProof domain model.
 *
 * These are AgentProof's own internal types. External data (8004scan,
 * indexers, RPC responses) is NEVER used directly as these types — it is
 * always parsed through a runtime validation boundary (see `validation.ts`)
 * and mapped through a source-specific adapter (see `packages/sources`)
 * before it becomes one of these.
 */

// ---------------------------------------------------------------------------
// Chain
// ---------------------------------------------------------------------------

/**
 * Supported chains. AgentProof V0 is BSC-first but the type is deliberately
 * a union (not a lone literal) so adding a chain later is a type-level
 * change, not a structural rewrite. Do not add chains here until an adapter
 * for them actually exists.
 */
export type ChainId = 'bsc';

export interface Chain {
  id: ChainId;
  /** e.g. 56 for BSC mainnet */
  chainId: number;
  name: string;
}

export const BSC: Chain = {
  id: 'bsc',
  chainId: 56,
  name: 'BNB Smart Chain',
};

export const SUPPORTED_CHAINS: readonly Chain[] = [BSC];

// ---------------------------------------------------------------------------
// Provenance — every piece of data AgentProof stores must say where it came
// from. This is not optional and not decorative: it's how a reviewer or a
// consumer of the API can tell "AgentProof measured this" apart from
// "the agent claimed this about itself".
// ---------------------------------------------------------------------------

export type ProvenanceSource =
  | 'ONCHAIN'
  | 'ERC8004_METADATA'
  | 'INDEXER'
  | 'AGENTPROOF_MEASUREMENT';

export interface Provenance {
  source: ProvenanceSource;
  /** Free-text identifier of the concrete origin, e.g. "8004scan:v1" or an RPC URL/label. Never a raw secret or credential. */
  origin: string;
  /** When AgentProof itself observed/ingested this, not necessarily when the underlying fact became true onchain. */
  observedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Agent identity & metadata
// ---------------------------------------------------------------------------

export interface AgentIdentity {
  /** AgentProof's own stable internal id (e.g. `${chainId}:${onchainId}`). */
  id: string;
  chain: ChainId;
  /** The ERC-8004 onchain identifier / registry entry id, as a string (may be a numeric tokenId or address-derived id depending on registry). */
  onchainId: string;
  /** Registry contract address that issued this identity, if known. */
  registryAddress?: string;
  provenance: Provenance;
}

export interface AgentMetadata {
  agentId: string;
  name?: string;
  description?: string;
  /** Raw metadata URI as declared onchain (e.g. an IPFS/HTTPS URI), before resolution. */
  metadataUri?: string;
  /** Whether AgentProof was able to fetch + parse the metadata document. This is an *observation*, not an assumption. */
  metadataResolved: boolean;
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Services — ERC-8004 metadata conventions currently in the wild use both
// "services" (current) and "endpoints" (legacy). AgentProof normalizes both
// into this single shape and prefers "services" when an agent declares both.
// ---------------------------------------------------------------------------

export type ServiceProtocol = 'HTTP' | 'A2A' | 'MCP' | 'UNKNOWN';

export interface AgentService {
  id: string;
  agentId: string;
  chain: ChainId;
  /** How this service was declared in the source metadata: current ("services") or legacy ("endpoints") convention. */
  declarationForm: 'SERVICES' | 'ENDPOINTS';
  protocol: ServiceProtocol;
  /** The advertised URL. AgentProof probes this — it never trusts it as already-working. */
  url: string;
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Probe targets — what the probe engine is asked to check. Distinct from
// ProbeObservation (the result). A target is a request; an observation is
// a timestamped fact about what happened when AgentProof acted on it.
// ---------------------------------------------------------------------------

export interface ProbeTarget {
  agentId: string;
  chain: ChainId;
  serviceId: string;
  url: string;
  protocol: ServiceProtocol;
}

// ---------------------------------------------------------------------------
// Probes & observations
// ---------------------------------------------------------------------------

export type ProbeType =
  | 'METADATA_RESOLUTION'
  | 'SERVICE_REACHABILITY'
  | 'HTTP_STATUS'
  | 'RESPONSE_LATENCY'
  | 'PROTOCOL_RESPONSE_VALIDITY';

/**
 * Distinguishes "the agent's service failed" from "AgentProof itself failed
 * to observe it" — the build prompt is explicit that these must never be
 * conflated (an upstream indexer outage must not make an agent look
 * unreliable).
 */
export type ProbeOutcome =
  | 'SUCCESS'
  | 'AGENT_UNREACHABLE'
  | 'DNS_FAILURE'
  | 'TIMEOUT'
  | 'PROTOCOL_INVALID'
  | 'UPSTREAM_INDEXER_FAILURE'
  | 'AGENTPROOF_INTERNAL_ERROR'
  | 'BLOCKED_BY_SECURITY_POLICY';

export interface ProbeObservation {
  id: string;
  agentId: string;
  chain: ChainId;
  serviceId?: string;
  probeType: ProbeType;
  timestamp: string; // ISO 8601
  outcome: ProbeOutcome;
  /** Present only when outcome === 'SUCCESS' and the probe measures time. */
  latencyMs?: number;
  /** Human-readable, non-sensitive failure detail. Never includes response bodies, credentials, or headers verbatim. */
  failureReason?: string;
  /** e.g. HTTP status code, when applicable. */
  httpStatus?: number;
  provenance: Provenance;
  probeVersion: string;
  methodologyVersion: string;
}

// ---------------------------------------------------------------------------
// Reliability windows — computed, not stored as raw truth. Always derived
// from ProbeObservation rows; never hand-edited.
// ---------------------------------------------------------------------------

export type ReliabilityWindowSize = '24h' | '7d' | '30d';

/**
 * How much measurement coverage backs a displayed reliability window.
 * This is NEVER a judgment about the agent — see docs/RELIABILITY_METHODOLOGY.md.
 * "STRONG" means "AgentProof has sufficient measurement coverage for the
 * displayed evidence", not "this agent is safe/good/trustworthy".
 */
export type EvidenceSufficiency = 'INSUFFICIENT' | 'LIMITED' | 'MODERATE' | 'STRONG';

export interface ReliabilityWindow {
  agentId: string;
  serviceId?: string;
  window: ReliabilityWindowSize;
  /** True only when sufficiency is at least LIMITED — see methodology doc for the exact thresholds. */
  sufficientData: boolean;
  dataSufficiency: EvidenceSufficiency;
  observationCount: number;
  successCount: number;
  failureCount: number;
  availabilityPct?: number;
  medianLatencyMs?: number;
  p95LatencyMs?: number;
  lastSuccessfulProbeAt?: string;
  lastProbeAt?: string;
  consecutiveFailures: number;
  methodologyVersion: string;
  computedAt: string;
}

// ---------------------------------------------------------------------------
// Reputation integrity — signals about the *shape* of feedback data, never
// a verdict on the agent. Deliberately hedged language throughout.
// ---------------------------------------------------------------------------

export type IntegritySignalType =
  | 'HIGH_REVIEWER_CONCENTRATION'
  | 'UNUSUAL_FEEDBACK_BURST'
  | 'LOW_REVIEWER_DIVERSITY'
  | 'POTENTIAL_RECIPROCAL_FEEDBACK_PATTERN';

export interface IntegritySignal {
  id: string;
  agentId: string;
  signalType: IntegritySignalType;
  /** A short, hedged, human-readable description. Never asserts fraud/Sybil as fact. */
  description: string;
  detectedAt: string;
  methodologyVersion: string;
  provenance: Provenance;
}

export interface ReputationEvidenceBase {
  agentId: string;
  methodologyVersion: string;
  computedAt: string;
  provenance: Provenance;
}

/**
 * Whether feedback data for an agent is actually available to analyze —
 * kept strictly separate from the analysis result itself. This exists so
 * "we haven't built/run feedback ingestion yet" (`NOT_INGESTED`) can never
 * be silently confused with "we ingested and found zero feedback records"
 * (`AVAILABLE` with `feedbackCount: 0`). Those are different facts and
 * must never collapse into the same empty-array response — see
 * docs/REPUTATION_INTEGRITY.md "Feedback availability semantics".
 */
export type FeedbackAvailability =
  | 'NOT_INGESTED'
  | 'AVAILABLE'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UNSUPPORTED';

/**
 * Reputation-integrity evidence for an agent. A discriminated union on
 * `feedbackAvailability`: the analysis fields (`feedbackCount`,
 * `dataSufficiency`, etc.) only exist when feedback was actually
 * available and analyzed. When it wasn't, callers get an honest status
 * and nothing else — never a fabricated "0 feedback, INSUFFICIENT"
 * result standing in for "we never checked."
 */
export type ReputationEvidence =
  | (ReputationEvidenceBase & {
      feedbackAvailability: 'AVAILABLE';
      feedbackCount: number;
      uniqueReviewerCount: number;
      /** Herfindahl-Hirschman-style concentration index across reviewers, 0..1 (see docs/REPUTATION_INTEGRITY.md). Only present once feedbackCount clears the minimum-sample threshold. */
      reviewerConcentration?: number;
      /** Share of feedback contributed by reviewers who left more than one review. Same threshold gate as reviewerConcentration. */
      repeatReviewConcentration?: number;
      dataSufficiency: EvidenceSufficiency;
      integritySignals: IntegritySignal[];
    })
  | (ReputationEvidenceBase & {
      feedbackAvailability: Exclude<FeedbackAvailability, 'AVAILABLE'>;
      integritySignals: [];
    });

/**
 * A single feedback/review record about an agent. This is the raw input to
 * the reputation-integrity engine — never presented directly as a verdict.
 */
export interface FeedbackRecord {
  agentId: string;
  reviewerId: string;
  timestamp: string; // ISO 8601
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Passport — the public-facing aggregate. Always assembled at read time
// from the above; never a separately-stored source of truth.
// ---------------------------------------------------------------------------

export interface AgentPassport {
  identity: AgentIdentity;
  metadata: AgentMetadata;
  services: AgentService[];
  reliability: ReliabilityWindow[];
  reputation?: ReputationEvidence;
  recentObservations: ProbeObservation[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Methodology versioning — introduced from day one per the build prompt.
// Bump these explicitly (never silently) when the underlying calculation
// changes, and keep historical observations interpretable under the
// methodology version they were collected with.
// ---------------------------------------------------------------------------

export const METHODOLOGY_VERSIONS = {
  probe: '0.1.0',
  reliability: '0.1.0',
  reputationIntegrity: '0.1.0',
} as const;
