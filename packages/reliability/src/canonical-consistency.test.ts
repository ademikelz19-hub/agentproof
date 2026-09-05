import { describe, expect, it } from 'vitest';
import {
  computeReliabilityWindow,
  computeAllWindows,
  filterAttributableObservations,
  isAttributableOutcome,
  isExcludedOutcome,
  AGENT_ATTRIBUTABLE_OUTCOMES,
  EXCLUDED_OUTCOMES,
} from './reliability-engine';
import type { ProbeObservation } from '@agentproof/core';

function makeObservation(
  outcome: ProbeObservation['outcome'],
  minutesAgo = 10,
  latencyMs?: number,
): ProbeObservation {
  const ts = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  return {
    id: `obs-${Math.random()}`,
    agentId: 'bsc:test-agent',
    chain: 'bsc',
    serviceId: 'bsc:test-agent:svc1',
    probeType: 'SERVICE_REACHABILITY',
    timestamp: ts,
    outcome,
    latencyMs,
    provenance: {
      source: 'AGENTPROOF_MEASUREMENT',
      origin: 'test-runner',
      observedAt: ts,
    },
    probeVersion: '0.1.0',
    methodologyVersion: '0.1.0',
  };
}

describe('Canonical Reliability & Outcome Categorization', () => {
  it('correctly categorizes all attributable and excluded outcomes without overlap', () => {
    for (const outcome of AGENT_ATTRIBUTABLE_OUTCOMES) {
      expect(isAttributableOutcome(outcome)).toBe(true);
      expect(isExcludedOutcome(outcome)).toBe(false);
    }
    for (const outcome of EXCLUDED_OUTCOMES) {
      expect(isExcludedOutcome(outcome)).toBe(true);
      expect(isAttributableOutcome(outcome)).toBe(false);
    }
  });

  it('excludes BLOCKED_BY_SECURITY_POLICY from availability math (does not penalize availability %)', () => {
    const now = new Date();
    // 5 SUCCESS observations + 3 BLOCKED_BY_SECURITY_POLICY observations
    const obs: ProbeObservation[] = [
      makeObservation('SUCCESS', 10, 200),
      makeObservation('SUCCESS', 20, 210),
      makeObservation('SUCCESS', 30, 220),
      makeObservation('SUCCESS', 40, 230),
      makeObservation('SUCCESS', 50, 240),
      makeObservation('BLOCKED_BY_SECURITY_POLICY', 15),
      makeObservation('BLOCKED_BY_SECURITY_POLICY', 25),
      makeObservation('BLOCKED_BY_SECURITY_POLICY', 35),
    ];

    const window = computeReliabilityWindow({
      agentId: 'bsc:test-agent',
      window: '24h',
      observations: obs,
      now,
    });

    // Attributable observationCount must be 5 (only the SUCCESS probes)
    expect(window.observationCount).toBe(5);
    expect(window.successCount).toBe(5);
    expect(window.failureCount).toBe(0);
    expect(window.availabilityPct).toBe(100);
  });

  it('excludes AGENTPROOF_INTERNAL_ERROR and UPSTREAM_INDEXER_FAILURE from availability math', () => {
    const now = new Date();
    const obs: ProbeObservation[] = [
      makeObservation('SUCCESS', 10, 150),
      makeObservation('SUCCESS', 20, 160),
      makeObservation('SUCCESS', 30, 170),
      makeObservation('AGENTPROOF_INTERNAL_ERROR', 15),
      makeObservation('UPSTREAM_INDEXER_FAILURE', 25),
    ];

    const window = computeReliabilityWindow({
      agentId: 'bsc:test-agent',
      window: '24h',
      observations: obs,
      now,
    });

    expect(window.observationCount).toBe(3);
    expect(window.successCount).toBe(3);
    expect(window.failureCount).toBe(0);
    expect(window.availabilityPct).toBe(100);
  });

  it('properly penalizes attributable failures (AGENT_UNREACHABLE, TIMEOUT, PROTOCOL_INVALID, DNS_FAILURE)', () => {
    const now = new Date();
    const obs: ProbeObservation[] = [
      makeObservation('SUCCESS', 10, 150),
      makeObservation('SUCCESS', 20, 160),
      makeObservation('AGENT_UNREACHABLE', 30),
      makeObservation('TIMEOUT', 40),
      makeObservation('PROTOCOL_INVALID', 50),
      makeObservation('DNS_FAILURE', 60),
    ];

    const window = computeReliabilityWindow({
      agentId: 'bsc:test-agent',
      window: '24h',
      observations: obs,
      now,
    });

    expect(window.observationCount).toBe(6);
    expect(window.successCount).toBe(2);
    expect(window.failureCount).toBe(4);
    // 2/6 = 33.333%
    expect(window.availabilityPct).toBeCloseTo(33.33, 1);
  });

  it('filterAttributableObservations accurately filters out excluded probe types', () => {
    const obs: ProbeObservation[] = [
      makeObservation('SUCCESS', 10),
      makeObservation('BLOCKED_BY_SECURITY_POLICY', 15),
      makeObservation('AGENT_UNREACHABLE', 20),
      makeObservation('AGENTPROOF_INTERNAL_ERROR', 25),
      makeObservation('PROTOCOL_INVALID', 30),
    ];

    const filtered = filterAttributableObservations(obs);
    expect(filtered.length).toBe(3);
    expect(filtered.map((o) => o.outcome)).toEqual([
      'SUCCESS',
      'AGENT_UNREACHABLE',
      'PROTOCOL_INVALID',
    ]);
  });

  it('computeAllWindows produces identical availability values for 24h as individual computeReliabilityWindow', () => {
    const now = new Date();
    const obs: ProbeObservation[] = [
      makeObservation('SUCCESS', 10, 100),
      makeObservation('SUCCESS', 20, 120),
      makeObservation('TIMEOUT', 30),
    ];

    const single24h = computeReliabilityWindow({
      agentId: 'bsc:test-agent',
      window: '24h',
      observations: obs,
      now,
    });

    const allWindows = computeAllWindows({
      agentId: 'bsc:test-agent',
      observations: obs,
      now,
    });

    expect(allWindows['24h'].availabilityPct).toBe(single24h.availabilityPct);
    expect(allWindows['24h'].observationCount).toBe(single24h.observationCount);
    expect(allWindows['24h'].successCount).toBe(single24h.successCount);
    expect(allWindows['24h'].failureCount).toBe(single24h.failureCount);
  });
});
