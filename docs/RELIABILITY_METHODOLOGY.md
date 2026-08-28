# Reliability Methodology

Methodology version: `0.1.0` (see `METHODOLOGY_VERSIONS.reliability` in
`@agentproof/core`). This document must be updated in lockstep with any
change to `packages/reliability/src/reliability-engine.ts` — the code is
the source of truth; this is its explanation.

## What this measures

Whether AgentProof could successfully connect to and get a well-formed
response from an agent's advertised service, over a recent time window.
**This is reachability, not correctness** — a service that responds but
returns wrong or malicious data still counts as "reachable" here (see
`PROTOCOL_RESPONSE_VALIDITY` for the narrower, honestly-limited claim about
response validity).

## What this does NOT measure

- Whether the agent's advertised functionality actually works correctly.
- Whether the agent is trustworthy, safe, or legitimate.
- Anything about the agent's onchain behavior or transaction history.

## Windows

Three fixed windows: `24h`, `7d`, `30d`. Each is computed independently
from the same underlying observation set — a 7d window is not a rollup of
24h windows, it's the same calculation applied to a wider slice of history.

## Outcome classification

Every stored `ProbeObservation` has an `outcome`. Only some outcomes are
evidence about the agent:

**Agent-attributable** (feed the calculations below):
`SUCCESS`, `AGENT_UNREACHABLE`, `DNS_FAILURE`, `TIMEOUT`, `PROTOCOL_INVALID`

**Excluded entirely** (AgentProof's own tooling/policy/upstream failure —
never used as evidence about the agent, per the build prompt's explicit
rule that an upstream indexer outage must not make an agent look
unreliable):
`UPSTREAM_INDEXER_FAILURE`, `AGENTPROOF_INTERNAL_ERROR`,
`BLOCKED_BY_SECURITY_POLICY`

## Formulas

Let `N` = count of agent-attributable observations in the window,
`S` = count with outcome `SUCCESS`, `F` = `N - S`.

- **Availability %** = `(S / N) × 100`, only computed when `N > 0` (never
  `0%` — an agent with zero attributable observations gets `undefined`,
  not a fabricated zero).
- **Median latency** — standard median (average of the two middle values
  for an even count) over `latencyMs` from `SUCCESS` observations only.
- **P95 latency** — nearest-rank method: sort successful latencies
  ascending, take the value at index `ceil(0.95 × count) − 1`.
- **Consecutive failures** — walk agent-attributable observations newest
  → oldest, count until the first `SUCCESS` (or the list ends).
- **Last probe at / last successful probe at** — max timestamp across the
  relevant subset.

## Evidence sufficiency

A displayed reliability window ALWAYS carries a `dataSufficiency` value:
`INSUFFICIENT | LIMITED | MODERATE | STRONG`. This is a statement about
**measurement coverage**, never about the agent:

> STRONG evidence means AgentProof has sufficient measurement coverage for
> the displayed reliability figures. It is not a safety or trust claim.

Rules (deterministic, in order):

1. If `observationCount < 3` → `INSUFFICIENT`.
2. If the most recent observation is older than 50% of the window's
   duration (e.g., no observation in the last 12h of a 24h window) →
   `INSUFFICIENT`, regardless of count — stale evidence is treated as no
   evidence.
3. Otherwise, a base tier from count: `≥30` → `STRONG`, `≥10` → `MODERATE`,
   else `LIMITED`.
4. `STRONG` is downgraded to `MODERATE` if the observations don't span at
   least 75% of the window's duration (earliest-to-latest gap).
5. `MODERATE` is downgraded to `LIMITED` if that span is under 25% of the
   window.

`sufficientData` (boolean) is `true` for anything except `INSUFFICIENT`.
UI/API consumers should treat `INSUFFICIENT` windows as "not enough
evidence to show a number" rather than displaying a misleading percentage
from two observations.

## Worked examples — SYNTHETIC, NOT PRODUCTION DATA

**Example A.** 40 `SUCCESS` observations evenly spread across the last 23
of 24 hours, all with `latencyMs` between 100–400. Result: `STRONG`
sufficiency, `availabilityPct: 100`, `medianLatencyMs` ≈ 250,
`consecutiveFailures: 0`.

**Example B.** 4 observations: 3×`SUCCESS`, 1×`AGENT_UNREACHABLE` (the most
recent one), all within the last 2 hours of a 24h window. Result: `LIMITED`
sufficiency (only 4 observations, tier caps at LIMITED regardless of
recency), `availabilityPct: 75`, `consecutiveFailures: 1`.

**Example C.** 2 observations only. Result: `INSUFFICIENT` — no
`availabilityPct` should be rendered at all in the UI for this window.

These are fabricated numbers for illustration only — see
`docs/BNB_GRANT_EVIDENCE.md` for the real status of live measurement.

## Limitations

- Sufficiency thresholds (3/10/30 observations, 25%/75% span ratios, 50%
  staleness cutoff) are deliberately simple, documented constants — not
  derived from a statistical model. They are a starting point for V0 and
  may be revised as real observation volume tells us more about what
  "enough evidence" looks like in practice; any revision bumps
  `METHODOLOGY_VERSIONS.reliability`.
- `DNS_FAILURE` is currently treated as agent-attributable (the agent's own
  domain failing to resolve is evidence about their service), but this
  conflates "the agent's DNS is misconfigured" with "the agent's registrar/
  DNS provider had an outage" — these are not distinguished in V0.
- Latency percentiles use nearest-rank on whatever successful observations
  exist in-window; with few observations (e.g. 3) "p95" is not a
  statistically meaningful percentile — this is why sufficiency tiers cap
  low for small counts, but the number is still computed and returned
  (paired with the sufficiency flag so consumers can decide whether to
  trust it).

## Semantic audit note

Reliability evidence was specifically re-checked (alongside the
reputation-integrity module) for the general class of bug where "unknown"
collapses into "zero," "not measured" collapses into "failed," or
"AgentProof's own failure" collapses into "the agent's failure." It
already avoided all three: `observationCount: 0` yields `availabilityPct:
undefined` (never a fabricated `0`), a `dataSufficiency` of `INSUFFICIENT`
never implies poor reliability (it's a distinct field, checked
separately), and `UPSTREAM_INDEXER_FAILURE`/`AGENTPROOF_INTERNAL_ERROR`/
`BLOCKED_BY_SECURITY_POLICY` are excluded from the math entirely rather
than counted as agent-caused failures (see "Outcome classification"
above) — so AgentProof's own tooling problems can never be reported as
the agent's unreliability. No code change was needed here; this note
records that the check happened.
