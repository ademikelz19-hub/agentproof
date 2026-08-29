/**
 * Singleton Drizzle client for the web application.
 *
 * Uses the pooled connection (DATABASE_URL) for normal query traffic and
 * the direct connection (DATABASE_URL_UNPOOLED) for migrations (run via
 * drizzle-kit, not this module).
 *
 * The Pool is lazily created on first use so that `next build` — which
 * imports all route modules for static analysis but never executes queries
 * — does not require DATABASE_URL to be present in the build environment.
 * It IS required at runtime: the first actual query will throw clearly if
 * DATABASE_URL is missing.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;

function getDb(): DrizzleDb {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Make sure .env.local is present in the agentproof root directory.'
    );
  }

  const pool = new Pool({
    connectionString,
    // Reasonable defaults for a serverless-friendly pool:
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 30_000,
  });

  _db = drizzle(pool, { schema });
  return _db;
}

/**
 * Lazily-initialized Drizzle db instance.
 * Accessing .select(), .insert() etc. will trigger pool creation on first use.
 */
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type Db = typeof db;
