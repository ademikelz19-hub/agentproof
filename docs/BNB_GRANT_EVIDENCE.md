# BNB Grant Evidence Ledger

Every claim AgentProof might make in a grant application, with its actual
evidence and status. A claim never moves to `PASS` without a concrete,
checkable artifact (a file, a test result, a live URL). This ledger is
part of the product, not marketing copy.

Status tokens used below are literal — copy them exactly when referencing
this table elsewhere, do not paraphrase them into softer language.

| Claim | Evidence | Repository file | Live URL | Status | Notes |
|---|---|---|---|---|---|
| Secure, SSRF-hardened probe engine exists | 36 adversarial IP-policy tests + 17 transport tests, all passing | `packages/probes/src/{ip-policy,transport}.ts` + their `.test.ts` files | — (not deployed) | **PASS** | Tested against loopback, RFC1918, link-local/metadata, CGNAT, IPv6 equivalents, IPv4-mapped IPv6, redirect-to-private-IP, oversized/slow responses. |
| Reliability calculations are deterministic and tested | 19 tests covering availability, latency, consecutive failures, sufficiency, and canonical consistency | `packages/reliability/` | — | **PASS** | Formulas documented in `docs/RELIABILITY_METHODOLOGY.md`. |
| Reputation-integrity engine exists and avoids loaded language | 14 tests, including an explicit test that signal text never contains accusatory terms and 4 tests covering feedback-availability semantics | `packages/reputation/` | — | **PASS** | No ML classification; deterministic thresholds only. |
| Read-only public API & Health Monitor implemented | 8 routes, zod-validated, bounded pagination, stable error schema; verified live against Neon backend (200/404/400/405 all verified). Lightweight `/api/v1/health` endpoint for external uptime monitors. | `apps/web/app/api/v1/**` | `https://agentproof-rho.vercel.app/api/v1/agents?chain=bsc&limit=10` | **PASS** | Deployed on Vercel; live queries backed by Neon PostgreSQL. |
| Real BSC agents are monitored | 3,051 observations written to Neon across 309 agents (52 active cohort); probe runs verified via `/api/v1/agents/bsc/bsc:316375/reliability`. `scripts/run-monitoring.ts` automates cohort ingestion + rate-limited service probing. | `scripts/run-monitoring.ts`, `packages/probes/` | `https://agentproof-rho.vercel.app/agents/bsc/bsc:316375` | **PASS** | Network access to 8004scan confirmed working. BSC RPC/BscScan not required — 8004scan serves as the indexer source. |
| 8004scan adapter is verified against real data | Live requests to `https://8004scan.io/api/v1/public/agents` and `…/agents/56/{tokenId}` return correct data; response schema matches adapter expectations. 11,730 feedback records fetched from `/feedbacks?chainId=56`. | `packages/sources/src/eight-o-four-scan-adapter.ts` | `https://agentproof-rho.vercel.app/api/v1/agents/bsc/bsc:2518/reputation-integrity` | **PASS** | Priority cohort included for verified human-reviewed agents (@pancakeswap, @heyibinance, @evilcos, etc.). |
| Real reputation/feedback ingestion exists | `scripts/ingest-feedbacks.ts` fetches 8004scan `/feedbacks?chainId=56`, decodes `feedback_uri`, groups by agentId, runs `computeReputationEvidence`, persists snapshots + integrity signals. Verified in Neon. `DrizzleReputationRepository.listFeedback` returns `{status: 'AVAILABLE', records: [...]}`. | `scripts/ingest-feedbacks.ts`, `packages/db/src/drizzle-repositories.ts` | `https://agentproof-rho.vercel.app/api/v1/agents/bsc/bsc:2518/reputation-integrity` | **PASS** | Client-side filtering ensures reviews match exact tokenId. |
| AgentFlow consumes AgentProof | Reference contract only | `docs/AGENTFLOW_INTEGRATION.md` | — | **NOT YET VERIFIED** | AgentFlow's codebase has not been touched or connected. |
| AgentProof API is publicly accessible | 8 public read routes live and smoke tested with pagination, error handling, rate limiting | `apps/web/app/api/v1/**` | `https://agentproof-rho.vercel.app/api/v1/agents?chain=bsc&limit=10` | **PASS** | Deployed to Vercel production; backed by live Neon PostgreSQL. |
| Live Postgres database provisioned | Neon project `red-paper-73359363` connected; 7 tables migrated and verified: `agents` (321 rows), `services` (518 rows), `observations` (3,051 rows), `probe_runs` (15 runs), `methodology_versions`, `reputation_snapshots`, `integrity_signals`. `DATABASE_URL` wired via `.env.local`. | `packages/db/`, `drizzle.config.ts` | — | **PASS** | Neon free tier (0.5 GB). Pooled connection via `DATABASE_URL`. |
| Production deployment (hosting the app itself) | Next.js 15 production build deployed to Vercel; all UI views and API routes live | `apps/web/` | `https://agentproof-rho.vercel.app` | **PASS** | Deployed to Vercel production; all smoke tests passing. |
| AgentProof monitoring operates autonomously without owner's laptop | GitHub Actions scheduled workflow (`monitor-agents.yml`) running hourly (`0 * * * *`). 15 autonomous probe cycles recorded. | `.github/workflows/monitor-agents.yml`, `scripts/run-monitoring.ts` | `https://github.com/ademikelz19-hub/agentproof/actions/workflows/monitor-agents.yml` | **PASS** | Autonomous cloud runs verified. |
| Research report / "State of BNB Agent Reliability" | Template only, explicitly marked DRAFT | `docs/research/STATE_OF_BNB_AGENT_RELIABILITY_2026.md` | — | **AWAITING LIVE DATA** | Contains no findings — accumulating empirical observations first. |
| Independent developers/users use AgentProof | — | — | — | **NOT YET VERIFIED** | Zero known users. This claim should not appear in any grant materials as anything stronger than "not yet verified" until it's demonstrably true. |
| Production dependency tree has no known vulnerabilities | `npm audit --omit=dev` → 0 findings | `package-lock.json` | — | **PASS** | Re-verified after each dependency bump; dev-only toolchain moderate finding tracked separately. |

## Reading this table

Anything not marked `PASS` should not be described as working in grant
materials, pitch decks, or marketing copy — including implicitly, through
vague language. "AgentProof monitors real BSC agents" is confirmed working.
Likewise, "append-only" claims anywhere in the product should say "application-level
append-only evidence architecture," never "immutable" or "tamper-proof" —
see `docs/ARCHITECTURE.md` "Append-only enforcement level" for why that
distinction matters.
