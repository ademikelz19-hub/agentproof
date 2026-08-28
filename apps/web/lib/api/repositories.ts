/**
 * Central place the API routes get their repositories from.
 *
 * STATUS: no database is deployed yet (Phase D/G do not require one — see
 * docs/ENVIRONMENT_BASELINE.md). These in-memory repositories start empty
 * and stay empty in this environment: every route reads real (if currently
 * zero) data through the same interfaces a real database would satisfy,
 * rather than special-casing "no DB" with fabricated responses anywhere.
 *
 * When a real Postgres connection is available and
 * `packages/db`'s Drizzle repositories have been verified against it,
 * swap the three `new InMemory...Repository()` calls below for
 * `new Drizzle...Repository(db)` — no route handler code needs to change,
 * since they only depend on the @agentproof/core interfaces.
 */

import {
  InMemoryAgentRepository,
  InMemoryObservationRepository,
  InMemoryReputationRepository,
} from '@agentproof/core';

export const agentRepository = new InMemoryAgentRepository();
export const observationRepository = new InMemoryObservationRepository();
// Explicit 'NOT_INGESTED' (also the constructor default, spelled out here
// for clarity): no feedback-ingestion pipeline exists yet, so every
// reputation-integrity route/page honestly reports "not yet ingested"
// rather than "checked and found zero." See
// docs/REPUTATION_INTEGRITY.md "Feedback availability semantics".
export const reputationRepository = new InMemoryReputationRepository([], 'NOT_INGESTED');
