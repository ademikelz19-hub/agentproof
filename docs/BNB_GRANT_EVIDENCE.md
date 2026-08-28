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
| Reliability calculations are deterministic and tested | 13 tests covering availability/latency/consecutive-failures/sufficiency | `packages/reliability/` | — | **PASS after tested** | Formulas documented in `docs/RELIABILITY_METHODOLOGY.md`. |
| Reputation-integrity engine exists and avoids loaded language | 14 tests, including an explicit test that signal text never contains accusatory terms and 4 tests covering feedback-availability semantics | `packages/reputation/` | — | **PASS after tested** | No ML classification; deterministic thresholds only. |
| Read-only public API implemented | 7 routes, zod-validated, bounded pagination, stable error schema; manually smoke-tested (200/404/400 all correct) | `apps/web/app/api/v1/**` | — (not deployed) | **PASS (code) / BLOCKED_OWNER_CREDENTIALS (deployment)** | Builds and runs locally; not deployed to a public URL. |
| Real BSC agents are monitored | — | — | — | **BLOCKED_LIVE_NETWORK** | This sandbox cannot reach BSC RPC, BscScan, or 8004scan (confirmed `403 host_not_allowed`, see `docs/ENVIRONMENT_BASELINE.md`). No ingestion has ever run against a real agent. |
| 8004scan adapter is verified against real data | — | `packages/sources/src/eight-o-four-scan-adapter.ts` | — | **BLOCKED_LIVE_NETWORK** | Adapter is structurally complete but its base URL and response schema are unconfirmed guesses (see the file's own doc comment). |
| Real reputation/feedback ingestion exists | — | `packages/db/src/drizzle-repositories.ts` (`listFeedback`) | — | **NOT_IMPLEMENTED** | No feedback-ingestion pipeline has been designed, let alone built — `listFeedback` returns `{status: 'NOT_INGESTED', records: []}` unconditionally, an explicit typed status rather than a fabricated empty result (see `docs/REPUTATION_INTEGRITY.md` "Feedback availability semantics"). Once a pipeline is designed, ingesting real data will additionally require **BLOCKED_LIVE_NETWORK** to be resolved. |
| AgentFlow consumes AgentProof | Reference contract only | `docs/AGENTFLOW_INTEGRATION.md` | — | **NOT YET VERIFIED** | AgentFlow's codebase has not been touched or connected. |
| AgentProof API is publicly accessible | — | — | — | **BLOCKED_OWNER_CREDENTIALS** | No hosting account/credentials available in this sandbox to deploy to Vercel or similar. |
| Live Postgres database provisioned | Schema + Drizzle repository implementations exist, untested against a live instance | `packages/db/` | — | **BLOCKED_OWNER_CREDENTIALS** | Provisioning a free-tier Postgres (Neon/Supabase) needs an owner-controlled account; this sandbox has none. Independent of the BSC-network block above — this is a credentials gap, not a network-reachability gap. |
| Production deployment (hosting the app itself) | Builds cleanly (`next build`) | `apps/web/` | — | **BLOCKED_OWNER_CREDENTIALS** | Same as the API row above — deployment needs owner-controlled hosting credentials not available here. |
| Research report / "State of BNB Agent Reliability" | Template only, explicitly marked DRAFT | `docs/research/STATE_OF_BNB_AGENT_RELIABILITY_2026.md` | — | **AWAITING LIVE DATA** | Contains no findings — see the file itself. |
| Independent developers/users use AgentProof | — | — | — | **NOT YET VERIFIED** | Zero known users. This claim should not appear in any grant materials as anything stronger than "not yet verified" until it's demonstrably true. |
| Production dependency tree has no known vulnerabilities | `npm audit --omit=dev` → 0 findings | `package-lock.json` | — | **PASS** | Re-verified after each dependency bump this session; dev-only toolchain (esbuild/vite/vitest) has one open moderate finding, tracked separately, not shipped to production. |

## Reading this table

Anything not marked `PASS` should not be described as working in grant
materials, pitch decks, or marketing copy — including implicitly, through
vague language. "AgentProof monitors real BSC agents" is currently false
and must not be claimed until the BSC row above says `PASS`. Likewise,
"append-only" claims anywhere in the product should say "application-level
append-only evidence architecture," never "immutable" or "tamper-proof" —
see `docs/ARCHITECTURE.md` "Append-only enforcement level" for why that
distinction matters and what would need to change for a stronger claim.
