import { describe, expect, it } from 'vitest';
import type { FeedbackQueryResult, FeedbackRecord } from '@agentproof/core';
import { computeReputationEvidence } from './reputation-engine';

function available(records: FeedbackRecord[]): FeedbackQueryResult {
  return { status: 'AVAILABLE', records };
}

/** Narrows the ReputationEvidence union for tests that expect the AVAILABLE-with-analysis branch. */
function expectAvailable(result: ReturnType<typeof computeReputationEvidence>) {
  if (result.feedbackAvailability !== 'AVAILABLE') {
    throw new Error(`expected feedbackAvailability AVAILABLE, got ${result.feedbackAvailability}`);
  }
  return result;
}

const AGENT = 'bsc:1';
const NOW = new Date('2026-08-28T12:00:00.000Z');

function fb(reviewerId: string, daysAgo: number): FeedbackRecord {
  return {
    agentId: AGENT,
    reviewerId,
    timestamp: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    provenance: { source: 'INDEXER', origin: 'test', observedAt: NOW.toISOString() },
  };
}

describe('computeReputationEvidence — small sample handling', () => {
  it('reports INSUFFICIENT and no signals below the minimum sample size', () => {
    const feedback = [fb('r1', 1), fb('r2', 2), fb('r3', 3)];
    const result = expectAvailable(computeReputationEvidence({ agentId: AGENT, feedback: available(feedback), now: NOW }));
    expect(result.dataSufficiency).toBe('INSUFFICIENT');
    expect(result.integritySignals).toHaveLength(0);
    // Concentration/diversity numbers are not computed at all below the threshold —
    // never present a false sense of precision from a tiny sample.
    expect(result.reviewerConcentration).toBeUndefined();
  });
});

describe('computeReputationEvidence — concentration', () => {
  it('flags HIGH_REVIEWER_CONCENTRATION when one reviewer dominates', () => {
    const feedback = [
      fb('whale', 1),
      fb('whale', 2),
      fb('whale', 3),
      fb('whale', 4),
      fb('whale', 5),
      fb('other', 6),
    ];
    const result = computeReputationEvidence({ agentId: AGENT, feedback: available(feedback), now: NOW });
    expect(result.integritySignals.map((s) => s.signalType)).toContain('HIGH_REVIEWER_CONCENTRATION');
  });

  it('does not flag concentration when feedback is evenly distributed', () => {
    const feedback = Array.from({ length: 10 }, (_, i) => fb(`reviewer-${i}`, i + 1));
    const result = computeReputationEvidence({ agentId: AGENT, feedback: available(feedback), now: NOW });
    expect(result.integritySignals.map((s) => s.signalType)).not.toContain('HIGH_REVIEWER_CONCENTRATION');
  });

  it('computes a Herfindahl-style concentration index between 1/N and 1', () => {
    const feedback = Array.from({ length: 10 }, (_, i) => fb(`reviewer-${i}`, i + 1));
    const result = expectAvailable(computeReputationEvidence({ agentId: AGENT, feedback: available(feedback), now: NOW }));
    expect(result.reviewerConcentration).toBeCloseTo(0.1, 5); // perfectly even across 10 reviewers -> HHI = 1/10
  });
});

describe('computeReputationEvidence — diversity', () => {
  it('flags LOW_REVIEWER_DIVERSITY when few unique reviewers generate lots of feedback', () => {
    const feedback = [
      ...Array.from({ length: 10 }, (_, i) => fb('r1', i + 1)),
      ...Array.from({ length: 10 }, (_, i) => fb('r2', i + 1)),
    ];
    const result = computeReputationEvidence({ agentId: AGENT, feedback: available(feedback), now: NOW });
    expect(result.integritySignals.map((s) => s.signalType)).toContain('LOW_REVIEWER_DIVERSITY');
  });
});

describe('computeReputationEvidence — burst detection', () => {
  it('flags UNUSUAL_FEEDBACK_BURST when most feedback lands in a tight window', () => {
    const feedback = [
      // 6 reviews within the same day
      fb('r1', 1),
      fb('r2', 1.1),
      fb('r3', 1.2),
      fb('r4', 1.3),
      fb('r5', 1.4),
      fb('r6', 1.5),
      // 1 review long ago
      fb('r7', 60),
    ];
    const result = computeReputationEvidence({ agentId: AGENT, feedback: available(feedback), now: NOW });
    expect(result.integritySignals.map((s) => s.signalType)).toContain('UNUSUAL_FEEDBACK_BURST');
  });

  it('does not flag a burst when feedback is spread out over time', () => {
    const feedback = Array.from({ length: 10 }, (_, i) => fb(`r${i}`, i * 10));
    const result = computeReputationEvidence({ agentId: AGENT, feedback: available(feedback), now: NOW });
    expect(result.integritySignals.map((s) => s.signalType)).not.toContain('UNUSUAL_FEEDBACK_BURST');
  });
});

describe('computeReputationEvidence — never uses loaded/accusatory language', () => {
  it('signal descriptions never contain accusatory terms', () => {
    const feedback = [
      fb('whale', 1),
      fb('whale', 2),
      fb('whale', 3),
      fb('whale', 4),
      fb('whale', 5),
      fb('other', 6),
    ];
    const result = computeReputationEvidence({ agentId: AGENT, feedback: available(feedback), now: NOW });
    const forbidden = /scam|fraud|fake|sybil|malicious/i;
    for (const signal of result.integritySignals) {
      expect(signal.description).not.toMatch(forbidden);
    }
  });
});

describe('computeReputationEvidence — sufficiency tiers scale with sample size', () => {
  it('reports LIMITED just above the minimum sample', () => {
    const feedback = Array.from({ length: 6 }, (_, i) => fb(`r${i}`, i + 1));
    const result = expectAvailable(computeReputationEvidence({ agentId: AGENT, feedback: available(feedback), now: NOW }));
    expect(result.dataSufficiency).toBe('LIMITED');
  });

  it('reports STRONG with a large, established sample', () => {
    const feedback = Array.from({ length: 45 }, (_, i) => fb(`r${i}`, i + 1));
    const result = expectAvailable(computeReputationEvidence({ agentId: AGENT, feedback: available(feedback), now: NOW }));
    expect(result.dataSufficiency).toBe('STRONG');
  });
});

describe('computeReputationEvidence — feedback availability semantics', () => {
  it('distinguishes NOT_INGESTED from AVAILABLE-with-zero-records', () => {
    const notIngested = computeReputationEvidence({
      agentId: AGENT,
      feedback: { status: 'NOT_INGESTED', records: [] },
      now: NOW,
    });
    const availableEmpty = computeReputationEvidence({
      agentId: AGENT,
      feedback: { status: 'AVAILABLE', records: [] },
      now: NOW,
    });

    expect(notIngested.feedbackAvailability).toBe('NOT_INGESTED');
    expect(availableEmpty.feedbackAvailability).toBe('AVAILABLE');

    // NOT_INGESTED never carries analysis fields at all — not even a
    // dataSufficiency of INSUFFICIENT, which would wrongly imply "we
    // looked and found too little," rather than "we never looked."
    expect('dataSufficiency' in notIngested).toBe(false);
    expect('feedbackCount' in notIngested).toBe(false);

    // AVAILABLE-with-zero DOES carry analysis fields — it's a real,
    // computed result that happens to be zero, distinct from "unknown."
    const narrowed = expectAvailable(availableEmpty);
    expect(narrowed.feedbackCount).toBe(0);
    expect(narrowed.dataSufficiency).toBe('INSUFFICIENT'); // zero is a genuinely small sample
  });

  it('never computes dataSufficiency or signals for UPSTREAM_UNAVAILABLE', () => {
    const result = computeReputationEvidence({
      agentId: AGENT,
      feedback: { status: 'UPSTREAM_UNAVAILABLE', records: [] },
      now: NOW,
    });
    expect(result.feedbackAvailability).toBe('UPSTREAM_UNAVAILABLE');
    expect('dataSufficiency' in result).toBe(false);
    expect(result.integritySignals).toHaveLength(0);
  });

  it('never computes dataSufficiency or signals for UNSUPPORTED', () => {
    const result = computeReputationEvidence({
      agentId: AGENT,
      feedback: { status: 'UNSUPPORTED', records: [] },
      now: NOW,
    });
    expect(result.feedbackAvailability).toBe('UNSUPPORTED');
    expect('dataSufficiency' in result).toBe(false);
  });

  it('ignores stray records on a non-AVAILABLE result — never analyzes data alongside an unavailable status', () => {
    // Defensive: even if a caller mistakenly attaches records to a
    // non-AVAILABLE status, the engine must not analyze them — status
    // governs, not the presence of records.
    const result = computeReputationEvidence({
      agentId: AGENT,
      feedback: { status: 'NOT_INGESTED', records: [fb('r1', 1), fb('r2', 2)] },
      now: NOW,
    });
    expect(result.feedbackAvailability).toBe('NOT_INGESTED');
    expect('feedbackCount' in result).toBe(false);
  });
});
