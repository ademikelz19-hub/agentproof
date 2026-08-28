/**
 * Adapter boundary.
 *
 * AgentProof's domain model must never be tightly coupled to any single
 * external source's response shape (8004scan, a future indexer, direct RPC
 * reads, etc). Every source implements `ChainAgentIndexer`, and every
 * concrete adapter is responsible for taking whatever raw shape its source
 * returns, validating it (see `validation.ts`), and normalizing it into
 * AgentProof's own `AgentIdentity` / `AgentMetadata` / `AgentService` types.
 *
 * Nothing in `packages/core` or `packages/probes` imports a source-specific
 * package. The dependency direction is: sources -> core, never core -> sources.
 */

import type { AgentIdentity, AgentMetadata, AgentService, ChainId } from './domain';

export interface IngestionResult<T> {
  ok: true;
  data: T;
}

export interface IngestionFailure {
  ok: false;
  /** One of the standard failure categories — see domain.ts ProbeOutcome for the shared vocabulary. Ingestion reuses UPSTREAM_INDEXER_FAILURE / AGENTPROOF_INTERNAL_ERROR / BLOCKED_LIVE_NETWORK. */
  reason: 'UPSTREAM_INDEXER_FAILURE' | 'AGENTPROOF_INTERNAL_ERROR' | 'BLOCKED_LIVE_NETWORK';
  detail: string;
}

export type Ingested<T> = IngestionResult<T> | IngestionFailure;

/**
 * A source of ERC-8004 agent identities/metadata for a given chain
 * (an indexer API, or a direct-RPC reader). Each chain may have more than
 * one `ChainAgentIndexer` implementation (e.g. indexer-backed vs.
 * RPC-backed) but every implementation returns AgentProof's own domain
 * types, never the raw source shape.
 */
export interface ChainAgentIndexer {
  readonly chain: ChainId;
  /** Short, stable label identifying this concrete source for provenance, e.g. "8004scan" or "bsc-rpc-direct". */
  readonly sourceLabel: string;

  listAgents(opts?: { limit?: number; cursor?: string }): Promise<Ingested<AgentIdentity[]>>;

  getAgentMetadata(agentId: string): Promise<Ingested<AgentMetadata>>;

  getAgentServices(agentId: string): Promise<Ingested<AgentService[]>>;
}

/**
 * A generic "external source" wrapper used by adapters: fetch raw bytes,
 * hand them to a validator, normalize on success. This exists so adapters
 * share one shape for "fetch -> validate -> normalize -> provenance-tag"
 * rather than each reinventing it.
 */
export interface ExternalSource<Raw> {
  readonly label: string;
  fetchRaw(path: string): Promise<Raw>;
}
