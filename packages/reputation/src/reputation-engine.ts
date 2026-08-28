/**
 * Reputation integrity engine (build prompt Phase F).
 *
 * Analyses the SHAPE of available feedback data — never whether an agent
 * is good, safe, or trustworthy. Every signal is deterministic, documented
 * in docs/REPUTATION_INTEGRITY.md, and phrased with explicit hedging
 * ("high concentration", "unusual burst") rather than accusatory language
 * ("Sybil", "fake", "fraud"). No ML classification, no malicious-actor
 * labeling — see build prompt section 8.
 *
 * Pure function of `(FeedbackQueryResult) -> ReputationEvidence`, no I/O.
 * Takes a `FeedbackQueryResult` (status + records) rather than a bare
 * array specifically so that "feedback was never ingested" and "feedback
 * was ingested and there are zero records" can never collapse into the
 * same computation — see docs/REPUTATION_INTEGRITY.md "Feedback
 * availability semantics".
 */

import { randomUUID } from 'node:crypto';
import {
  METHODOLOGY_VERSIONS,
  type EvidenceSufficiency,
  type FeedbackQueryResult,
  type IntegritySignal,
  type Provenance,
  type ReputationEvidence,
} from '@agentproof/core';

// --- Thresholds (documented in REPUTATION_INTEGRITY.md) ---
const MIN_SAMPLE_FOR_ANY_SIGNAL = 5;
const MIN_SAMPLE_FOR_MODERATE = 15;
const MIN_SAMPLE_FOR_STRONG = 40;
const HIGH_CONCENTRATION_THRESHOLD = 0.4; // top reviewer's share of all feedback
const LOW_DIVERSITY_THRESHOLD = 0.3; // uniqueReviewers / feedbackCount
const BURST_WINDOW_MS = 24 * 60 * 60 * 1000;
const BURST_FRACTION_THRESHOLD = 0.5; // fraction of all feedback landing in one 24h window

function classifySufficiency(feedbackCount: number): EvidenceSufficiency {
  if (feedbackCount < MIN_SAMPLE_FOR_ANY_SIGNAL) return 'INSUFFICIENT';
  if (feedbackCount >= MIN_SAMPLE_FOR_STRONG) return 'STRONG';
  if (feedbackCount >= MIN_SAMPLE_FOR_MODERATE) return 'MODERATE';
  return 'LIMITED';
}

/** Herfindahl-Hirschman-style concentration index over reviewer shares, 0..1. 1/N (perfectly even) up to 1 (single reviewer). */
function herfindahlConcentration(counts: number[], total: number): number {
  if (total === 0) return 0;
  return counts.reduce((sum, c) => sum + (c / total) ** 2, 0);
}

/** Largest single reviewer's share of all feedback. */
function topReviewerShare(counts: number[], total: number): number {
  if (total === 0) return 0;
  return Math.max(...counts) / total;
}

/** Maximum fraction of all feedback that falls inside any 24h sliding window. */
function maxBurstFraction(timestampsMs: number[]): number {
  if (timestampsMs.length === 0) return 0;
  const sorted = [...timestampsMs].sort((a, b) => a - b);
  let maxCount = 0;
  let windowStart = 0;
  for (let i = 0; i < sorted.length; i++) {
    while (sorted[i]! - sorted[windowStart]! > BURST_WINDOW_MS) {
      windowStart += 1;
    }
    const countInWindow = i - windowStart + 1;
    if (countInWindow > maxCount) maxCount = countInWindow;
  }
  return maxCount / sorted.length;
}

export interface ComputeReputationEvidenceParams {
  agentId: string;
  /**
   * A `FeedbackQueryResult`, not a bare array — pass through exactly what
   * the repository returned. This function refuses to treat a
   * non-`AVAILABLE` status as if it were an empty-but-genuine dataset.
   */
  feedback: FeedbackQueryResult;
  now: Date;
  methodologyVersion?: string;
  provenanceOrigin?: string;
}

export function computeReputationEvidence(params: ComputeReputationEvidenceParams): ReputationEvidence {
  const { agentId, feedback, now } = params;
  const methodologyVersion = params.methodologyVersion ?? METHODOLOGY_VERSIONS.reputationIntegrity;
  const provenance: Provenance = {
    source: 'AGENTPROOF_MEASUREMENT',
    origin: params.provenanceOrigin ?? 'agentproof-reputation-integrity',
    observedAt: now.toISOString(),
  };

  if (feedback.status !== 'AVAILABLE') {
    // Feedback was never ingested, or the upstream source is unavailable,
    // or this isn't supported for this agent/chain yet. This is NOT the
    // same fact as "zero feedback records exist" — never compute
    // dataSufficiency or any signal from an absent dataset.
    return {
      agentId,
      feedbackAvailability: feedback.status,
      integritySignals: [],
      methodologyVersion,
      computedAt: now.toISOString(),
      provenance,
    };
  }

  const agentFeedback = feedback.records.filter((f) => f.agentId === agentId);
  const feedbackCount = agentFeedback.length;

  const countsByReviewer = new Map<string, number>();
  for (const f of agentFeedback) {
    countsByReviewer.set(f.reviewerId, (countsByReviewer.get(f.reviewerId) ?? 0) + 1);
  }
  const uniqueReviewerCount = countsByReviewer.size;
  const counts = [...countsByReviewer.values()];

  const dataSufficiency = classifySufficiency(feedbackCount);
  const signals: IntegritySignal[] = [];

  if (dataSufficiency === 'INSUFFICIENT') {
    return {
      agentId,
      feedbackAvailability: 'AVAILABLE',
      feedbackCount,
      uniqueReviewerCount,
      dataSufficiency,
      integritySignals: [],
      methodologyVersion,
      computedAt: now.toISOString(),
      provenance,
    };
  }

  const reviewerConcentration = herfindahlConcentration(counts, feedbackCount);
  const topShare = topReviewerShare(counts, feedbackCount);
  const diversityRatio = feedbackCount > 0 ? uniqueReviewerCount / feedbackCount : 0;
  const repeatReviewers = counts.filter((c) => c > 1);
  const repeatFeedbackCount = repeatReviewers.reduce((sum, c) => sum + c, 0);
  const repeatReviewConcentration = feedbackCount > 0 ? repeatFeedbackCount / feedbackCount : 0;

  if (topShare > HIGH_CONCENTRATION_THRESHOLD) {
    signals.push({
      id: randomUUID(),
      agentId,
      signalType: 'HIGH_REVIEWER_CONCENTRATION',
      description: `The largest single reviewer accounts for ${(topShare * 100).toFixed(0)}% of all feedback (${feedbackCount} total). High reviewer concentration.`,
      detectedAt: now.toISOString(),
      methodologyVersion,
      provenance,
    });
  }

  if (diversityRatio < LOW_DIVERSITY_THRESHOLD) {
    signals.push({
      id: randomUUID(),
      agentId,
      signalType: 'LOW_REVIEWER_DIVERSITY',
      description: `Only ${uniqueReviewerCount} unique reviewer(s) account for ${feedbackCount} feedback records (${(diversityRatio * 100).toFixed(0)}% diversity ratio). Low reviewer diversity.`,
      detectedAt: now.toISOString(),
      methodologyVersion,
      provenance,
    });
  }

  const burstFraction = maxBurstFraction(agentFeedback.map((f) => new Date(f.timestamp).getTime()));
  if (burstFraction > BURST_FRACTION_THRESHOLD) {
    signals.push({
      id: randomUUID(),
      agentId,
      signalType: 'UNUSUAL_FEEDBACK_BURST',
      description: `${(burstFraction * 100).toFixed(0)}% of all feedback arrived within a single 24-hour window. Unusual feedback burst relative to this agent's available history.`,
      detectedAt: now.toISOString(),
      methodologyVersion,
      provenance,
    });
  }

  // POTENTIAL_RECIPROCAL_FEEDBACK_PATTERN is intentionally not evaluated
  // here: detecting it requires cross-agent reviewer-graph data (does
  // reviewer X's own agent also receive feedback from this agent's
  // owner?) that a single agent's feedback list cannot supply. See
  // docs/REPUTATION_INTEGRITY.md "Limitations" for why this signal type
  // exists in the domain model but is not yet populated in V0.

  return {
    agentId,
    feedbackAvailability: 'AVAILABLE',
    feedbackCount,
    uniqueReviewerCount,
    reviewerConcentration,
    repeatReviewConcentration,
    dataSufficiency,
    integritySignals: signals,
    methodologyVersion,
    computedAt: now.toISOString(),
    provenance,
  };
}
