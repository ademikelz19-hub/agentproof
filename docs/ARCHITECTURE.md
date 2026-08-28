# Architecture (Phase A–C)

## Repository structure

```
agentproof/
  apps/
    web/                  Next.js app — placeholder only in this phase
  packages/
    core/                 Domain model, runtime validation, adapter interfaces
    probes/                SSRF-safe transport, IP policy, rate limiting, probe runners
    sources/               Chain/indexer adapters (8004scan skeleton), normalization
    db/                    Drizzle schema (not deployed — schema definition only)
  docs/                    This file and its siblings
  research/                Placeholder for Phase K
```

npm workspaces, no separate build orchestrator. Each package has its own
`tsconfig.json` (extending `tsconfig.base.json`) and its own `vitest`
config via `package.json` scripts.

## Why not Fastify (build prompt correction 9)

The build prompt's original instruction assumed Fastify + Next.js +
node-cron as three separate execution systems. Evaluated against the
actual Phase A–C scope and V0's security requirement that **the public
API must never perform a probe synchronously from a user request** (probes
only run from scheduled/background execution; the API only reads stored
evidence):

- Phase A–C does not build a deployed API at all (that's Phase G) or a
  deployed scheduler (Phase D/J are gated behind live network access this
  sandbox doesn't have). There's nothing running yet that would need
  Fastify's routing/schema-validation feature set.
- When the API is built (Phase G), Next.js's own route handlers are
  sufficient for the described endpoints (`GET` routes over stored
  evidence, with `zod` for input validation — same runtime-validation
  approach already used in `packages/core/src/validation.ts`). Introducing
  a second HTTP framework alongside Next.js would add operational surface
  (two servers, or a proxy layer) without a capability Next.js's API
  routes lack for this read-only, GET-heavy API shape.
- The probe scheduler doesn't need an HTTP framework at all — it's a
  scheduled background job (GitHub Actions / Vercel Cron triggering a
  standalone TypeScript entrypoint that imports `packages/probes` and
  `packages/sources` directly), not a service that receives requests.

Conclusion: **Next.js (API routes, when built) + a standalone TypeScript
probe command (triggered by scheduled CI/cron) + Postgres**, no Fastify.
If a future phase surfaces a concrete need Fastify uniquely satisfies
(e.g. streaming/WebSocket evidence feeds), that's a deliberate decision to
revisit then — not a default to reach for now.

## Domain model

See `packages/core/src/domain.ts` for the full types. Summary of the
shapes and why they're separate:

- `AgentIdentity` / `AgentMetadata` / `AgentService` — what an agent
  *declares* about itself (onchain identity, metadata document, advertised
  services). Every record carries a `Provenance` (source + origin +
  observedAt) so nothing here is ever presented without saying where it
  came from.
- `ProbeTarget` — what the probe engine is asked to check (derived from
  `AgentService`, not identical to it — a target is a request, not a
  record).
- `ProbeObservation` — a timestamped *fact* about what happened when
  AgentProof acted on a target. Enforced via an application-level
  append-only evidence architecture (see "Append-only enforcement level"
  below). Every observation carries `probeVersion` and
  `methodologyVersion` so it stays interpretable if either changes later.
- `ReliabilityWindow` / `ReputationEvidence` / `IntegritySignal` — derived,
  computed data. Never stored as if it were raw truth; always
  reconstructable from the observation history plus a methodology version.
- `AgentPassport` — the public-facing aggregate, assembled at read time
  from the above. Not a separately-persisted source of truth.

## Append-only enforcement level (be precise about what this means)

Observations are append-only **at the application level**: the
`ObservationRepository` interface (`packages/core/src/repositories.ts`)
exposes only `recordObservation` (insert) and `listObservations` (read) —
there is no update or delete method on the interface, so no code path in
this codebase can call one. This is enforced by interface design and
verified by test (`packages/core/src/in-memory-repositories.test.ts`).

**This is not database-level or cryptographic immutability.** Nothing here
prevents a party with direct database access (e.g. a future engineer
running raw SQL, or a compromised credential) from mutating or deleting
rows outside the application. There is no write-once storage engine,
no cryptographic hash chaining, and no tamper-evidence mechanism of any
kind. Docs and code comments should say "application-level append-only
evidence architecture" — never "immutable" or "tamper-proof" — until
database-level controls actually exist.

**TODO (Phase I):** once a live Postgres instance is provisioned,
evaluate database-level protections — e.g. a `REVOKE UPDATE, DELETE` on
the `observations` table for the application's runtime role, a
database-level trigger that rejects UPDATE/DELETE, or (if warranted) an
append-only/WORM-capable storage backend. This is explicitly deferred, not
forgotten — track it alongside the other Phase I checklist items in
`docs/LAPTOP_HANDOFF.md`.

## Adapter architecture (source → normalized domain model)

`ChainAgentIndexer` (in `packages/core/src/adapters.ts`) is the interface
every chain/indexer source implements. The dependency direction is
one-way: `packages/sources` depends on `packages/core`, never the reverse
— so the domain model is never coupled to any one source's response shape.

Ingestion is split into three explicit stages (build prompt correction 2):

1. **Raw fetch** — an `ExternalSource` fetches unknown/untyped bytes.
2. **Runtime validation** — `packages/core/src/validation.ts`'s
   `parseExternal`/`parseExternalJsonText` run the raw JSON through a zod
   schema (`rawAgentMetadataSchema`) and return a `ValidationResult`
   (`{ok:true,data}` or `{ok:false,error,raw}`) — never throws, so
   malformed external data becomes a recorded failure, not a crashed probe
   run.
3. **Normalization** — `packages/sources/src/normalize.ts`'s
   `normalizeAgentServices` maps validated raw data onto AgentProof's own
   `AgentService[]`, preferring the current `"services"` declaration form
   over the legacy `"endpoints"` form when an agent declares both, and
   never inventing a URL for an entry that didn't actually declare one.

The concrete `EightOFourScanAdapter` implements `ChainAgentIndexer` but is
explicitly `BLOCKED_LIVE_NETWORK` in this environment (see
`docs/ENVIRONMENT_BASELINE.md` and the adapter's own doc comment) — every
method returns a structured failure rather than fabricated data.

## Probe engine

`packages/probes/src/probe-runner.ts` implements the five V0 probe types
as pure functions of `(ProbeTarget) -> Promise<ProbeObservation>`, built
exclusively on `safeRequest` (see `docs/SECURITY_MODEL.md`). Each probe
type keeps a specific claim separate from adjacent ones — `HTTP_STATUS`
records a status code as a successful *observation* even when that status
is 500 (AgentProof successfully observed a 500; that's different from
AgentProof failing to reach the agent), and `PROTOCOL_RESPONSE_VALIDITY`
returns `PROTOCOL_INVALID` with an honest "no validator implemented yet"
reason for A2A/MCP rather than inferring protocol correctness from a bare
HTTP 200.

## Methodology versioning

`packages/core/src/domain.ts` exports `METHODOLOGY_VERSIONS` (currently
`{probe: "0.1.0", reliability: "0.1.0", reputationIntegrity: "0.1.0"}`).
Every `ProbeObservation` stamps both `probeVersion` and
`methodologyVersion` at creation time. When a methodology changes later,
historical rows remain interpretable under the version they were actually
collected with — nothing here retroactively reinterprets old observations
under a new formula.
