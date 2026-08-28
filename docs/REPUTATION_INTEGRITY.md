# Reputation Integrity

Methodology version: `0.1.0` (`METHODOLOGY_VERSIONS.reputationIntegrity`).
Implemented in `packages/reputation/src/reputation-engine.ts`.

## What this is — and is not

This module analyses the **shape** of available feedback data about an
agent — how concentrated it is among reviewers, how diverse the reviewer
set is, whether it arrived in an unusual burst. **It never determines
whether an agent is good, safe, or trustworthy**, and it never labels a
wallet or reviewer as malicious, fake, or Sybil. No ML classification is
used anywhere in this module — every signal is a deterministic threshold
check over counts a reviewer of this document can recompute by hand from
the same feedback data.

## Minimum sample size

No signal is ever computed with fewer than **5** feedback records for an
agent. Below that, `dataSufficiency: 'INSUFFICIENT'` and
`integritySignals: []` — small samples produce no opinion rather than a
false sense of precision.

## Feedback availability semantics

`ReputationEvidence` is a discriminated union on `feedbackAvailability`.
This exists to prevent a specific class of bug: **an empty result must
never be ambiguous about *why* it's empty.**

| `feedbackAvailability` | Meaning | Carries `feedbackCount`/`dataSufficiency`/signals? |
|---|---|---|
| `NOT_INGESTED` | AgentProof has not built/run a feedback-ingestion pipeline for this agent yet. | No |
| `UPSTREAM_UNAVAILABLE` | A feedback-ingestion pipeline exists, but the upstream source could not be reached for this request. | No |
| `UNSUPPORTED` | AgentProof does not support feedback analysis for this agent/chain. | No |
| `AVAILABLE` | Feedback was actually queried and the result (however many records, including zero) reflects reality. | Yes — always, even when `feedbackCount: 0` |

The critical distinction: `NOT_INGESTED` with no records and `AVAILABLE`
with `feedbackCount: 0` look similar at a glance ("no feedback shown") but
mean different things — one is "we haven't checked," the other is "we
checked and there's genuinely nothing yet." Collapsing them into the same
empty-array response would let a consumer (or a future engineer) treat
"we haven't built this" as if it were a real, checked, zero result — which
is exactly the kind of false precision this whole module exists to avoid.
This is enforced at the type level: only `AVAILABLE` results carry
`feedbackCount`, `uniqueReviewerCount`, `dataSufficiency`, or
concentration figures at all — the TypeScript compiler rejects code that
tries to read those fields off a non-`AVAILABLE` result without narrowing
first. See `packages/core/src/repositories.ts` (`FeedbackQueryResult`) and
`packages/reputation/src/reputation-engine.ts`.

## Data sufficiency tiers

- `INSUFFICIENT`: `< 5` feedback records
- `LIMITED`: `5–14`
- `MODERATE`: `15–39`
- `STRONG`: `≥ 40`

Same caveat as reliability: `STRONG` means "enough feedback volume to
compute these signals with some confidence," not "this agent has strong
reputation."

## Signals and formulas

**Reviewer concentration (Herfindahl-Hirschman-style index).**
For reviewer shares `p_i = count_i / total`, `HHI = Σ p_i²`. Ranges from
`1/N` (perfectly even across `N` reviewers) to `1` (single reviewer).
Reported as `reviewerConcentration` on every non-INSUFFICIENT result —
this is the primary concentration number, chosen because it's a standard,
reproducible measure (used identically in market-concentration analysis)
rather than an invented metric.

**HIGH_REVIEWER_CONCENTRATION signal.** Fires when the single
largest reviewer's share of all feedback exceeds **40%**. (This is a
simpler, more interpretable trigger than the HHI value itself — "one
reviewer wrote more than 4 in 10 of all reviews" — while `reviewerConcentration`
gives the fuller picture for anyone who wants to dig in.)

**LOW_REVIEWER_DIVERSITY signal.** Fires when
`uniqueReviewerCount / feedbackCount < 30%` — i.e., the same small set of
reviewers is repeatedly responsible for the visible feedback volume.

**Repeat-review concentration.** `repeatReviewConcentration` = the share of
all feedback contributed by reviewers who left more than one review. A
separate, related number to `LOW_REVIEWER_DIVERSITY` — the diversity ratio
counts unique reviewers vs. total, while this specifically measures how
much of the total came from repeat visitors.

**UNUSUAL_FEEDBACK_BURST signal.** Uses a sliding 24-hour window over
sorted feedback timestamps: find the maximum count of records falling
inside any single 24h window, divide by total feedback count. Fires when
that fraction exceeds **50%** — i.e., more than half of all feedback for
this agent arrived within one day, which is unusual for organic feedback
that would normally accumulate gradually.

**POTENTIAL_RECIPROCAL_FEEDBACK_PATTERN — not yet implemented.** Detecting
this requires a cross-agent reviewer graph (does reviewer X's own agent
also receive feedback from this agent's owner/operator?) that a single
agent's feedback list cannot supply on its own. The signal type exists in
the domain model (`IntegritySignalType`) so the API contract is stable
once this becomes derivable, but V0 never emits it. This is an explicit,
documented gap — not a silent omission.

## False-positive risk

Every signal above can fire for entirely legitimate reasons:

- A new agent might get a burst of feedback right after a launch
  announcement — that's `UNUSUAL_FEEDBACK_BURST` with no wrongdoing
  involved.
- A small, loyal user base naturally produces high concentration and low
  diversity — that's `HIGH_REVIEWER_CONCENTRATION` / `LOW_REVIEWER_DIVERSITY`
  from ordinary usage patterns, not manipulation.

These signals are inputs for a human (or a more sophisticated downstream
system) to investigate further — never a verdict to display as-is next to
an agent's name without the surrounding hedged language these descriptions
are written with.

## What AgentProof explicitly does NOT conclude

- That any reviewer or wallet is fake, a bot, or Sybil.
- That the agent is being manipulated.
- That concentrated/bursty feedback is evidence of fraud.
- Any probability or confidence score of malicious activity — no such
  score exists anywhere in this system.

## Worked example — SYNTHETIC, NOT PRODUCTION DATA

An agent with 20 feedback records: one reviewer (`whale.eth`) contributed
9 of them, the remaining 11 came from 11 distinct reviewers, all spread
over 3 months with no unusual clustering.

- `feedbackCount: 20`, `uniqueReviewerCount: 12`
- `reviewerConcentration` (HHI) ≈ `(9/20)² + 11×(1/20)²` ≈ `0.2025 + 0.0275`
  = `0.23`
- Top reviewer share = `9/20 = 45%` → **fires** `HIGH_REVIEWER_CONCENTRATION`
- Diversity ratio = `12/20 = 60%` → does **not** fire
  `LOW_REVIEWER_DIVERSITY` (threshold is 30%)
- No burst detected (feedback spread over 3 months)

This is a fabricated illustration; see `docs/BNB_GRANT_EVIDENCE.md` for
the real status of live reputation data (currently none — no feedback
ingestion pipeline is wired up yet, see Limitations below).

## Limitations

- No feedback-ingestion pipeline exists yet —
  `packages/db/src/drizzle-repositories.ts`'s `listFeedback` returns
  `{status: 'NOT_INGESTED', records: []}` unconditionally, because the
  source of feedback data (indexer/onchain reputation records) hasn't
  been designed or connected. This is a real, current gap, not a
  simplification — and it's now represented as an explicit status rather
  than an ambiguous empty array (see "Feedback availability semantics"
  above).
- Thresholds (40%/30%/50%, 5/15/40 sample tiers) are documented constants,
  not statistically derived — same caveat as the reliability methodology.
