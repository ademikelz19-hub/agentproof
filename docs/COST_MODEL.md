# Cost Model

Owner cash expenditure for V0 must remain **$0**. This document separates
the technical workload (which we can calculate precisely) from vendor
pricing (which we mark for verification rather than guessing).

## Workload by monitored-agent count

Assumptions: each agent has an average of 1.5 declared services; each
service is probed with all 4 automated probe types (`SERVICE_REACHABILITY`,
`HTTP_STATUS`, `RESPONSE_LATENCY`, `PROTOCOL_RESPONSE_VALIDITY` — metadata
resolution runs once per ingestion cycle, not per probe cycle) every 15
minutes (96 cycles/day) — a conservative cadence chosen to stay well under
free-tier compute/DB limits per `docs/PROBE_POLICY.md`'s rate-limiting
defaults.

| Agents | Services (×1.5) | Probes/cycle (×4) | Cycles/day | Observations/day | Observations/month |
|---|---|---|---|---|---|
| 100 | 150 | 600 | 96 | 57,600 | ~1.73M |
| 500 | 750 | 3,000 | 96 | 288,000 | ~8.64M |
| 1,000 | 1,500 | 6,000 | 96 | 576,000 | ~17.3M |
| 10,000 | 15,000 | 60,000 | 96 | 5,760,000 | ~172.8M |
| 100,000 | 150,000 | 600,000 | 96 | 57,600,000 | ~1.73B |

At 100k agents, this cadence is no longer realistic on free-tier
infrastructure (see below) — the build prompt explicitly says V0 should
not attempt to monitor at that scale; this row exists to show where the
free-tier ceiling is, not as a V0 target.

## Rough database row growth

Each `probe_observations` row is small (roughly a dozen columns, mostly
short strings/timestamps/integers — see `packages/db/src/schema.ts`),
estimated at ~300–500 bytes/row including index overhead. At 1,000 agents:
~17.3M rows/month → roughly 5–9 GB/month of raw table growth before any
retention/archival policy. **A retention policy (e.g. downsample
observations older than 90 days into daily rollups) will be necessary
before V0 reaches four-figure agent counts on a free-tier database** — not
yet designed; flagged here as a known future requirement.

## Compute/network implications (technical, not priced)

- **Probe execution**: 96 cycles/day is one scheduled job invocation every
  15 minutes; each invocation processes N services with per-host
  concurrency capped at 2 and global concurrency capped at 10 (see
  `docs/PROBE_POLICY.md`) — so wall-clock time per cycle scales with
  `services / 10` roughly, bounded by the 10s per-request timeout.
- **API read load**: read-only, cacheable (30–300s per route, see
  `docs/API.md`) — scales with consumer traffic, not with monitored-agent
  count directly.
- **Egress**: dominated by probe response bodies, capped at 2MB per
  response (`docs/SECURITY_MODEL.md`) — worst case `services × 2MB` per
  cycle, though real agent responses are expected to be far smaller.

## Vendor pricing — TO VERIFY BEFORE FUNDING REQUEST

The following are **not independently verified** in this environment
(no live network access to pricing pages) and must be checked before using
them in a grant application:

- Postgres free-tier row/storage limits for Neon and Supabase — **TO VERIFY BEFORE FUNDING REQUEST**
- Vercel free-tier function-invocation and bandwidth limits — **TO VERIFY BEFORE FUNDING REQUEST**
- GitHub Actions free-tier minutes for scheduled cron jobs (alternative to Vercel Cron) — **TO VERIFY BEFORE FUNDING REQUEST**
- BSC public RPC rate limits (bsc-dataseed and alternatives) — **TO VERIFY BEFORE FUNDING REQUEST**
- 8004scan API rate limits, if/when its real base URL and terms are confirmed — **TO VERIFY BEFORE FUNDING REQUEST**

## What would eventually require funding

Based on the workload table above, the point at which $0 free-tier
infrastructure becomes insufficient is likely somewhere between the
1,000-agent and 10,000-agent rows — driven primarily by database storage
growth and possibly by RPC rate limits, not by compute. This is a rough
technical judgment, not a funded-cost estimate (see pricing caveats
above).
