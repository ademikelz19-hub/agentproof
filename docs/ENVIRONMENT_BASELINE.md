# Environment Baseline

Recorded from the current build sandbox on 2026-08-28. This file must be
regenerated (or diffed) once work moves to the owner's laptop/network, since
this sandbox has a restrictive egress allowlist that does **not** represent
the target deployment environment.

## Runtime

| Tool | Version |
|---|---|
| Node.js | v22.22.2 |
| npm | 10.9.7 |
| Python | 3.12.3 (available, not primary — TS is the chosen language) |
| git | 2.43.0 |
| OS | Linux x86_64 |

Git status: no existing repository — this is a clean start. No prior
AgentProof files were found anywhere on disk.

## Package manager

npm is available and reachable (registry.npmjs.org resolves, see below).
yarnpkg.com / registry.yarnpkg.com are also allowlisted. npm is the
recommended package manager for V0 — no reason to add yarn/pnpm complexity.

## Network connectivity (this sandbox only)

The sandbox sits behind an egress proxy with an **explicit domain
allowlist**. Requests to anything not on the list return `HTTP 403` with
header `x-deny-reason: host_not_allowed` — this is the proxy refusing the
connection, not the target server responding. Confirmed directly:

| Host | Result |
|---|---|
| `registry.npmjs.org` | ✅ reachable (HTTP 200) |
| `github.com` / `api.github.com` / `raw.githubusercontent.com` | ✅ allowlisted |
| `bsc-dataseed.binance.org` (BNB public RPC) | ❌ `403 host_not_allowed` |
| `api.bscscan.com` (BscScan API) | ❌ `403 host_not_allowed` |
| `8004scan.io` (guessed domain, unconfirmed as the real one) | ❌ `403 host_not_allowed` |

**This means: from this sandbox, AgentProof cannot make a single live call
to BNB Chain, BscScan, or any ERC-8004 indexer.** No RPC calls, no ingestion,
no probes against real agents are possible here, no matter how the code is
written. Per the build prompt's own rule ("do not repeatedly retry blocked
hosts"), this was tested once per host and recorded rather than retried.

npm/GitHub access being open means: dependency installation, scaffolding,
and pushing code to a GitHub repo all work fine from here. Anything that
needs BNB Chain or agent-ecosystem data does not.

## Consequence for phasing

- **Can be done fully in this sandbox:** architecture, domain model,
  TypeScript types, SSRF-safe probe engine logic (tested against
  sandbox-local HTTP servers, not real agents), database schema/migrations,
  API route logic + validation, reliability/reputation-integrity math,
  tests for all of the above, docs, landing/explorer/passport UI with
  clearly-labeled empty/`BLOCKED` states.
- **Requires the owner's laptop/network (or a deployment environment with
  open egress):** actual ERC-8004/BSC ingestion, live BscScan/8004scan
  calls, real probes against live agent endpoints, populating the research
  dataset and the "State of BNB Agent Reliability" report, verifying the
  Grant Evidence Ledger claims.

Any integration that can't be reached from here will be implemented against
the real interface/schema (so it's a drop-in once network access exists),
committed, and explicitly labeled `BLOCKED` in code comments and in
`docs/BNB_GRANT_EVIDENCE.md` — never faked with synthetic data standing in
for live results.
