/**
 * Central place the API routes get their repositories from.
 *
 * STATUS: Connected to Neon Postgres (project: red-paper-73359363).
 * Drizzle repositories are wired up using the singleton pool in
 * packages/db/src/db-client.ts. The connection string is read from
 * DATABASE_URL in .env.local (pooled via PgBouncer for query traffic).
 *
 * If DATABASE_URL is not set the db-client module will throw at import
 * time with a clear message so startup failure is obvious.
 *
 * Migrations are run separately via:
 *   npx drizzle-kit migrate
 * using DATABASE_URL_UNPOOLED (direct connection required for DDL).
 */

import { db } from '@agentproof/db';
import {
  DrizzleAgentRepository,
  DrizzleObservationRepository,
  DrizzleReputationRepository,
} from '@agentproof/db';

export const agentRepository = new DrizzleAgentRepository(db);
export const observationRepository = new DrizzleObservationRepository(db);
// DrizzleReputationRepository.listFeedback() returns NOT_INGESTED until
// a feedback-ingestion pipeline is built — identical semantics to the
// old InMemoryReputationRepository but backed by a real DB for writes.
export const reputationRepository = new DrizzleReputationRepository(db);
