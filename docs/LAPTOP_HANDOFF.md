# Laptop Handoff — Phase I Starting Checklist

This is the exact starting checklist for when unrestricted laptop/network
access returns. Work through it in order — later steps depend on earlier
ones. **Never commit secrets, API keys, or private keys to this file, to
any file in this repository, or to git history.** Use environment
variables / a local `.env` file (already gitignored — confirm before
adding secrets) or your hosting provider's secret manager.

Each item states what "done" looks like so it can be checked off
concretely, not just attempted.

## A. Verify real 8004scan endpoint/schema

- Confirm the actual base URL (the current
  `UNVERIFIED_EIGHT_O_FOUR_SCAN_BASE_URL` constant in
  `packages/sources/src/eight-o-four-scan-adapter.ts` is a guess).
- Hit a real listing/detail endpoint and inspect the raw response shape.
- Done when: you have at least one real, captured JSON response.

## B. Capture sanitized real response examples

- Save 2-3 real responses (list + detail) with any sensitive data
  (auth tokens, internal IDs not meant to be public) stripped.
- Store them under `packages/sources/src/__fixtures__/` prefixed
  `real-example-` (distinct from the existing `synthetic-` fixtures — do
  not mix real and synthetic data in the same file).
- Done when: the files exist and are reviewed for accidental secret
  leakage before committing.

## C. Correct adapter/runtime schema

- Update `rawAgentMetadataSchema` in `packages/core/src/validation.ts` to
  match the real shape from step B (field names, optionality, nesting).
- Update `EightOFourScanAdapter` in
  `packages/sources/src/eight-o-four-scan-adapter.ts` to implement
  `listAgents`/`getAgentMetadata`/`getAgentServices` for real, replacing
  the current `BLOCKED_LIVE_NETWORK` stub returns.
- Run `npm run test --workspace=@agentproof/core` and
  `npm run test --workspace=@agentproof/sources` — write new tests against
  the real fixture shape from step B before considering this done.
- Done when: those test suites pass against the real fixture shape, and
  the adapter's doc comment no longer says "UNVERIFIED."

## D. Verify BSC filtering

- Confirm the real 8004scan/RPC response includes an unambiguous chain
  identifier and that `packages/sources`'s normalization correctly maps it
  to `chain: 'bsc'` — never assume every returned agent is BSC without
  checking.
- Add a test with a real (or realistically-shaped) non-BSC response mixed
  into a batch, asserting it's filtered out or correctly tagged.
- Done when: that test exists and passes.

## E. Provision free Postgres

- Create a free-tier project on Neon or Supabase (owner-controlled
  account — this step needs credentials this sandbox never had).
- Note the connection string somewhere secret-safe — **not in this repo**.
- Done when: you can `psql` (or the provider's SQL console) into the new
  database.

## F. Apply migrations

- Generate migrations from `packages/db/src/schema.ts` using Drizzle Kit:
  ```
  npx drizzle-kit generate --schema=packages/db/src/schema.ts --dialect=postgresql --out=packages/db/migrations
  ```
- Apply them against the database from step E:
  ```
  npx drizzle-kit migrate --schema=packages/db/src/schema.ts --out=packages/db/migrations
  ```
  (Drizzle Kit reads the connection string from a config file or
  `DATABASE_URL` env var — set that env var locally, never hardcode it.)
- Done when: the tables listed in `packages/db/src/schema.ts` exist in the
  real database (verify with `\dt` in psql or the provider's table browser).

## G. Configure secrets safely

- Set `DATABASE_URL` (and any future API keys) as environment
  variables — locally via `.env.local` (confirm it's gitignored) and, for
  deployment, via the hosting provider's secret/env-var manager (e.g.
  Vercel's Environment Variables UI).
- Done when: no secret exists in any tracked file, and the app runs
  locally with the env var(s) set.

## H. Switch API repositories from in-memory to Drizzle

- In `apps/web/lib/api/repositories.ts`, replace:
  ```ts
  export const agentRepository = new InMemoryAgentRepository();
  export const observationRepository = new InMemoryObservationRepository();
  export const reputationRepository = new InMemoryReputationRepository([], 'NOT_INGESTED');
  ```
  with:
  ```ts
  import { drizzle } from 'drizzle-orm/node-postgres'; // or the Neon/Supabase-specific driver
  import { DrizzleAgentRepository, DrizzleObservationRepository, DrizzleReputationRepository } from '@agentproof/db';

  const db = drizzle(process.env.DATABASE_URL!);
  export const agentRepository = new DrizzleAgentRepository(db);
  export const observationRepository = new DrizzleObservationRepository(db);
  export const reputationRepository = new DrizzleReputationRepository(db);
  ```
- No route handler code should need to change — they only depend on the
  `@agentproof/core` interfaces.
- Done when: `npm run typecheck && npm run test && npm run build` all
  still pass, and a manual smoke test against the real DB (steps I-K)
  returns real data instead of empty results.

## I. Select bounded real BSC cohort

- Per `docs/PROBE_POLICY.md`/`docs/COST_MODEL.md`, start small — e.g. the
  first 50-100 real agents discovered via step C's ingestion, not the
  full ecosystem.
- Done when: a specific, documented cohort size and selection rule is
  written down (even just a comment in the ingestion script).

## J. Run safe probes

- Wire up a scheduled entrypoint (a standalone script, per
  `docs/ARCHITECTURE.md`'s "why not Fastify" — no HTTP framework needed)
  that: ingests the cohort from step I, then calls the probe functions in
  `packages/probes/src/probe-runner.ts` against each agent's declared
  services, respecting `ProbeRateLimiter` from `packages/probes/src/rate-limit.ts`.
- Start with a single manual run before scheduling it via cron/Vercel Cron.
- Done when: one manual run completes without errors and without
  exceeding the concurrency/interval limits in `docs/PROBE_POLICY.md`.

## K. Verify observations persist

- After step J's run, query the `observations` table directly (psql or
  the provider's console) and confirm rows exist with real `agentId`,
  `outcome`, `timestamp` values.
- Done when: `SELECT count(*) FROM observations;` returns a non-zero
  number matching what step J's run reported.

## L. Verify Reliability Passport uses genuine evidence

- Visit `/agents/bsc/<a real agent id from step I>` and confirm the
  Reliability section shows real `dataSufficiency`/`availabilityPct`
  computed from the observations in step K — not the "no evidence yet"
  empty state.
- Done when: a real, non-empty reliability window renders correctly, and
  its numbers match what you'd compute by hand from the raw observation
  rows (spot-check at least one).

## M. Verify reputation ingestion

- This requires designing and building a feedback-ingestion pipeline that
  doesn't exist yet (see `docs/REPUTATION_INTEGRITY.md` "Limitations" and
  the `NOT_IMPLEMENTED` row in `docs/BNB_GRANT_EVIDENCE.md`) — this is
  the one item on this list that isn't just "flip the switch," it's new
  design work.
- Once built, `packages/db/src/drizzle-repositories.ts`'s `listFeedback`
  must return `{status: 'AVAILABLE', records: [...]}` for agents with real
  ingested feedback, and `{status: 'UPSTREAM_UNAVAILABLE', records: []}`
  (not silently `NOT_INGESTED`) if the ingestion pipeline exists but a
  specific fetch fails.
- Done when: `computeReputationEvidence` produces a real, non-`NOT_INGESTED`
  result for at least one agent with genuine feedback data.

## N. Deploy using free tier

- Deploy `apps/web` to Vercel (or an equivalent free-tier host) with the
  env vars from step G configured there.
- Done when: the deployed URL loads the landing page and
  `/api/v1/methodology` returns a 200.

## O. Verify public API

- From outside your own network, `curl` the deployed
  `/api/v1/agents/bsc/<real id>/reliability` and confirm it returns real
  data matching step L.
- Done when: that curl succeeds and the JSON matches what the UI shows.

## P. Integrate AgentFlow as first consumer

- Follow the read flow documented in `docs/AGENTFLOW_INTEGRATION.md`
  exactly — that document was written in advance for this step.
- Done when: AgentFlow's own codebase makes a real request against the
  deployed API from step N and renders the result — a code review or a
  screenshot of it working, not just "should work."
- Update the AgentFlow row in `docs/BNB_GRANT_EVIDENCE.md` from
  `NOT YET VERIFIED` to `PASS` only once this is true.

## Q. Accumulate historical observations

- Let the scheduled probe run (step J) continue for at least a few days
  before generating any research findings — a 24h-old dataset can't
  populate a meaningful 30d reliability window (see
  `docs/RELIABILITY_METHODOLOGY.md`'s evidence-sufficiency rules; they'll
  correctly show `LIMITED`/`INSUFFICIENT` until enough time has passed).
- Done when: at least one agent in the cohort shows `dataSufficiency:
  'STRONG'` on its 30d window, which requires both observation count and
  time-span thresholds to be met — that's the real, honest signal that
  "enough time has passed," not a calendar guess.

## R. Generate aggregate research

- Build the aggregation functions listed in `research/README.md` against
  the real, accumulated data from step Q.
- Done when: those functions run against the real database and produce
  numbers you can sanity-check against a manual spot-check query.

## S. Update State of BNB Agent Reliability report

- Fill in `docs/research/STATE_OF_BNB_AGENT_RELIABILITY_2026.md`'s
  sections using the real output from step R — remove the "DRAFT —
  AWAITING LIVE MEASUREMENTS" banner only once every section has genuine
  content.
- Done when: every section cites a real, reproducible number, and the
  Reproducibility section states the exact query/methodology version used.

## T. Update grant evidence ledger

- Go through `docs/BNB_GRANT_EVIDENCE.md` row by row and update each
  status to `PASS` only where a concrete artifact now exists (a live URL,
  a passing test, a real deployed table) — per this checklist's "done
  when" criteria above, not on your own judgment call.
- Done when: every row that can honestly say `PASS` does, and every row
  that can't still says so plainly.

## Reminders

- Never put secrets, API keys, RPC URLs with embedded credentials, or
  private keys in this file or any other file in this repository.
- Do not skip ahead — later steps assume earlier ones are actually done,
  not just started.
- Re-run the full quality gate (`typecheck`, `test`, `build`,
  `npm audit --omit=dev`) after each lettered step that touches code, not
  just at the very end.
