# Research

This directory will hold aggregate research generated from AgentProof's
own genuine, stored measurements. **Nothing here is populated yet** — no
real BSC agents have been ingested or probed (see
`docs/ENVIRONMENT_BASELINE.md`, `docs/BNB_GRANT_EVIDENCE.md`).

## Planned aggregation functions

Once real observation data exists, code under this area (or a future
`packages/research` package) will compute, from genuinely stored rows
only:

- monitored BSC agent count
- metadata resolution rate (`metadataResolved` true / total agents)
- service declaration rate (agents with ≥1 declared service / total)
- reachability rate (agents with ≥1 `SUCCESS` `SERVICE_REACHABILITY`
  observation / total probed)
- protocol validation rate
- latency distribution (percentiles across all monitored agents)
- reputation evidence coverage (agents with `dataSufficiency` above
  `INSUFFICIENT` / total)
- reviewer concentration distribution across agents with sufficient
  reputation data

## Rule

Aggregation logic is unit-tested against synthetic datasets only (see
`packages/reliability`/`packages/reputation` test suites for the
calculation primitives these aggregations will build on). Findings are
never published — in this directory, in `STATE_OF_BNB_AGENT_RELIABILITY_2026.md`,
or anywhere else — until computed from genuine, live-collected
observations.
