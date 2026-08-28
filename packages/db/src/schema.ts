/**
 * Drizzle schema for AgentProof.
 *
 * STATUS: schema definition only. Per the Phase A-C scope, no database is
 * deployed and no connection code runs against a real Postgres instance
 * yet — that's Phase D. This file exists so the shape is designed,
 * reviewable, and ready to migrate against a real free-tier Postgres
 * (Neon/Supabase) once that phase starts.
 *
 * Design rules encoded here (build prompt sections 10 & 20 + corrections):
 *   - `observations` follows an application-level append-only evidence
 *     architecture: no `updatedAt` column, and the application layer must
 *     never issue an UPDATE against it — only INSERT. This is enforced by
 *     the `ObservationRepository` interface shape (no update/delete
 *     method exists), not by any database-level constraint yet — see
 *     docs/ARCHITECTURE.md "Append-only enforcement level" for the exact
 *     distinction and the Phase I TODO to evaluate DB-level protections.
 *     (Enforcing "no public insert endpoint" is a separate, API-layer
 *     concern — see docs/SECURITY_MODEL.md.)
 *   - Every observation carries probe version + methodology version so
 *     historical rows remain interpretable if the methodology changes later.
 *   - Indexes are chosen for the specific access patterns the product
 *     needs: latest observation per service, time-window queries, and
 *     service history — not "index everything".
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const methodologyVersions = pgTable('methodology_versions', {
  id: text('id').primaryKey(), // e.g. "probe:0.1.0"
  kind: text('kind').notNull(), // "probe" | "reliability" | "reputation_integrity"
  version: text('version').notNull(),
  description: text('description'),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
});

export const agents = pgTable(
  'agents',
  {
    id: text('id').primaryKey(), // AgentProof internal id, e.g. "bsc:1234"
    chain: text('chain').notNull(),
    onchainId: text('onchain_id').notNull(),
    registryAddress: text('registry_address'),
    name: text('name'),
    description: text('description'),
    metadataUri: text('metadata_uri'),
    metadataResolved: boolean('metadata_resolved').notNull().default(false),
    provenanceSource: text('provenance_source').notNull(),
    provenanceOrigin: text('provenance_origin').notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull(),
    lastIngestedAt: timestamp('last_ingested_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    chainIdx: index('agents_chain_idx').on(table.chain),
    onchainUnique: uniqueIndex('agents_chain_onchain_unique').on(table.chain, table.onchainId),
  }),
);

export const services = pgTable(
  'services',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id').notNull(),
    chain: text('chain').notNull(),
    declarationForm: text('declaration_form').notNull(), // SERVICES | ENDPOINTS
    protocol: text('protocol').notNull(),
    url: text('url').notNull(),
    provenanceSource: text('provenance_source').notNull(),
    provenanceOrigin: text('provenance_origin').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    agentIdx: index('services_agent_idx').on(table.agentId),
  }),
);

export const probeRuns = pgTable('probe_runs', {
  id: text('id').primaryKey(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  targetAgentCount: integer('target_agent_count').notNull(),
  probeVersion: text('probe_version').notNull(),
});

/**
 * Append-only. The application layer only ever INSERTs here; there is no
 * UPDATE path and no public API can write to this table (see
 * docs/SECURITY_MODEL.md, "only trusted probe execution may write
 * measurements").
 */
export const observations = pgTable(
  'observations',
  {
    id: text('id').primaryKey(),
    probeRunId: text('probe_run_id'),
    agentId: text('agent_id').notNull(),
    chain: text('chain').notNull(),
    serviceId: text('service_id'),
    probeType: text('probe_type').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    outcome: text('outcome').notNull(),
    latencyMs: integer('latency_ms'),
    httpStatus: integer('http_status'),
    failureReason: text('failure_reason'),
    provenanceSource: text('provenance_source').notNull(),
    provenanceOrigin: text('provenance_origin').notNull(),
    probeVersion: text('probe_version').notNull(),
    methodologyVersion: text('methodology_version').notNull(),
  },
  (table) => ({
    // Primary access pattern: "latest observations for this agent/service".
    agentTimeIdx: index('observations_agent_time_idx').on(table.agentId, table.timestamp),
    serviceTimeIdx: index('observations_service_time_idx').on(table.serviceId, table.timestamp),
    // Time-window queries (24h/7d/30d rollups) scan by timestamp across agents.
    timeIdx: index('observations_time_idx').on(table.timestamp),
  }),
);

export const reputationSnapshots = pgTable(
  'reputation_snapshots',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id').notNull(),
    feedbackCount: integer('feedback_count').notNull(),
    uniqueReviewerCount: integer('unique_reviewer_count').notNull(),
    reviewerConcentration: real('reviewer_concentration'),
    repeatReviewConcentration: real('repeat_review_concentration'),
    methodologyVersion: text('methodology_version').notNull(),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull(),
    provenanceSource: text('provenance_source').notNull(),
    provenanceOrigin: text('provenance_origin').notNull(),
  },
  (table) => ({
    agentTimeIdx: index('reputation_snapshots_agent_time_idx').on(table.agentId, table.computedAt),
  }),
);

export const integritySignals = pgTable(
  'integrity_signals',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id').notNull(),
    signalType: text('signal_type').notNull(),
    description: text('description').notNull(),
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull(),
    methodologyVersion: text('methodology_version').notNull(),
    provenanceSource: text('provenance_source').notNull(),
    provenanceOrigin: text('provenance_origin').notNull(),
  },
  (table) => ({
    agentIdx: index('integrity_signals_agent_idx').on(table.agentId),
  }),
);
