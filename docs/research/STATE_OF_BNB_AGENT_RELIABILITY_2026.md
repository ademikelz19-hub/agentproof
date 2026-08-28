# State of BNB Agent Reliability — 2026

> **DRAFT — AWAITING LIVE MEASUREMENTS.**
> This document contains no findings. Every section below is a template
> to be filled in once AgentProof has ingested real ERC-8004 agents on BSC
> and collected genuine probe observations over a meaningful period. See
> `docs/ENVIRONMENT_BASELINE.md` for why that hasn't happened yet in this
> environment, and `docs/BNB_GRANT_EVIDENCE.md` for current verified
> status. Do not cite this document as containing results.

## Executive Summary

_To be written once findings exist. Should summarize the headline
reachability/availability/protocol-validity rates across the monitored
cohort, in 3–5 sentences, with links to the detailed sections below._

## Methodology

Reference `docs/RELIABILITY_METHODOLOGY.md` and
`docs/REPUTATION_INTEGRITY.md` directly rather than restating formulas
here — this section should describe the specific parameters used for this
report (which window, what date range, what methodology version) once a
real run happens.

## Sample

_To be filled: how many agents were in the monitored cohort, how they were
selected (see `docs/PROBE_POLICY.md`'s bounded-cohort approach), over what
date range._

## Metadata Quality

_Metadata resolution rate, services-vs-endpoints declaration split, once
real ingestion has run._

## Service Availability

_Aggregate availability figures across the cohort, broken out by
`dataSufficiency` tier — never presenting `INSUFFICIENT`-tier agents'
numbers as if they were `STRONG`-tier._

## Protocol Compliance

_`PROTOCOL_RESPONSE_VALIDITY` results — note V0 only validates plain HTTP;
A2A/MCP validators aren't implemented yet (see
`docs/RELIABILITY_METHODOLOGY.md`), so this section must state that
limitation explicitly for those protocols._

## Latency

_Distribution of median/p95 latencies across the cohort._

## Reputation Evidence

_Coverage: what fraction of agents have reputation data above
`INSUFFICIENT`. Note the feedback-ingestion pipeline gap documented in
`docs/REPUTATION_INTEGRITY.md`'s Limitations section — this section may
end up saying "no reputation data is available yet" if that gap isn't
closed by the time this report is written._

## Integrity Signals

_Aggregate counts of each `IntegritySignalType` across the cohort, with
the same hedged framing used throughout `docs/REPUTATION_INTEGRITY.md` —
never presented as fraud/Sybil rates._

## Limitations

_Carry forward the real, current limitations from
`docs/RELIABILITY_METHODOLOGY.md` and `docs/REPUTATION_INTEGRITY.md`, plus
anything specific to how this particular report's sample was collected
(e.g. probe cadence, cohort size, time window)._

## Recommendations

_To be written once findings exist._

## Reproducibility

_This report must be reproducible from stored data: state the exact query/
aggregation code path used (once `packages/research` or equivalent
exists), the methodology version, and the date range, so a third party
could recompute the same numbers from the same underlying observations._
