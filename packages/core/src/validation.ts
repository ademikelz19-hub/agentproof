/**
 * Runtime validation boundary.
 *
 * Rule: no external byte stream (HTTP response body, RPC result, indexer
 * JSON) may cross into AgentProof's domain model without first passing
 * through a zod schema here. TypeScript types are compile-time only and
 * prove nothing about what actually arrived over the network — a `.parse()`
 * call is what actually enforces the boundary at runtime.
 *
 * This module intentionally has ZERO knowledge of any specific external
 * source's schema (that lives in `packages/sources`, source by source).
 * It only provides the generic parsing helpers + failure-safe result type
 * that every adapter is required to use.
 */

import { z } from 'zod';

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; raw: unknown };

/**
 * Parse `raw` (untyped, from the network) against `schema`. Never throws —
 * malformed external data must fail safely and become a recorded
 * `PROTOCOL_INVALID` / `UPSTREAM_INDEXER_FAILURE` observation, not an
 * unhandled exception that takes down a probe run.
 */
export function parseExternal<T>(schema: z.ZodType<T>, raw: unknown): ValidationResult<T> {
  const result = schema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    error: result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; '),
    raw,
  };
}

/**
 * Parse a raw JSON string (e.g. an HTTP response body) safely: JSON.parse
 * failures are treated the same as schema-validation failures, not thrown.
 */
export function parseExternalJsonText<T>(
  schema: z.ZodType<T>,
  text: string,
): ValidationResult<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      error: `invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      raw: text,
    };
  }
  return parseExternal(schema, raw);
}

// ---------------------------------------------------------------------------
// Generic ERC-8004-style agent metadata schema.
//
// IMPORTANT: this schema is written from the public ERC-8004 metadata
// convention description in the build prompt (agents may declare either
// "services" (current) or "endpoints" (legacy)). It has NOT been validated
// against a real, network-fetched 8004scan or onchain-metadata response in
// this environment, because that network access is blocked here (see
// docs/ENVIRONMENT_BASELINE.md). Treat this schema as UNVERIFIED /
// best-effort until it has been exercised against real responses from an
// unrestricted environment, and update it then.
// ---------------------------------------------------------------------------

const rawServiceSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  protocol: z.string().optional(),
  url: z.string().optional(),
  endpoint: z.string().optional(),
});

const rawEndpointSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
  endpoint: z.string().optional(),
});

export const rawAgentMetadataSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    services: z.array(rawServiceSchema).optional(),
    endpoints: z.array(rawEndpointSchema).optional(),
  })
  .passthrough(); // unknown extra fields are preserved but not trusted/used

export type RawAgentMetadata = z.infer<typeof rawAgentMetadataSchema>;

export { rawServiceSchema, rawEndpointSchema };
