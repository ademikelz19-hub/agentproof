import { describe, expect, it } from 'vitest';
import type { ProbeObservation, ProbeOutcome } from '@agentproof/core';
import { computeReliabilityWindow } from './reliability-engine';

const AGENT = 'bsc:1';
const SERVICE = 'svc-1';

function obs(
  hoursAgo: number,
  outcome: ProbeOutcome,
  overrides: Partial<ProbeObservation> = {},
): ProbeObservation {
  const now = new Date('2026-08-28T12:00:00.000Z');
  return {
    id: `obs-${hoursAgo}-${Math.random()}`,
    agentId: AGENT,
    chain: 'bsc',
    serviceId: SERVICE,
    probeType: 'SERVICE_REACHABILITY',
    timestamp: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString(),
    outcome,
    provenance: { source: 'AGENTPROOF_MEASUREMENT', origin: 'test', observedAt: now.toISOString() },
    probeVersion: '0.1.0',
    methodologyVersion: '0.1.0',
    ...overrides,
  };
}

const NOW = new Date('2026-08-28T12:00:00.000Z');

describe('computeReliabilityWindow — availability', () => {
  it('computes availability as successCount / attributable observation count', () => {
    const observations = [
      obs(1, 'SUCCESS'),
      obs(2, 'SUCCESS'),
      obs(3, 'SUCCESS'),
      obs(4, 'AGENT_UNREACHABLE'),
    ];
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    expect(result.observationCount).toBe(4);
    expect(result.successCount).toBe(3);
    expect(result.failureCount).toBe(1);
    expect(result.availabilityPct).toBe(75);
  });

  it('leaves availabilityPct undefined when there are zero attributable observations', () => {
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations: [], now: NOW });
    expect(result.availabilityPct).toBeUndefined();
  });

  it('never counts AgentProof-attributable failures against the agent', () => {
    const observations = [
      obs(1, 'SUCCESS'),
      obs(2, 'UPSTREAM_INDEXER_FAILURE'),
      obs(3, 'AGENTPROOF_INTERNAL_ERROR'),
      obs(4, 'BLOCKED_BY_SECURITY_POLICY'),
    ];
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    // Only the one SUCCESS should count; the three AgentProof-side outcomes must be excluded entirely.
    expect(result.observationCount).toBe(1);
    expect(result.availabilityPct).toBe(100);
  });
});

describe('computeReliabilityWindow — latency', () => {
  it('computes median latency from successful observations only', () => {
    const observations = [
      obs(1, 'SUCCESS', { latencyMs: 100 }),
      obs(2, 'SUCCESS', { latencyMs: 200 }),
      obs(3, 'SUCCESS', { latencyMs: 300 }),
      obs(4, 'AGENT_UNREACHABLE', { latencyMs: undefined }),
    ];
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    expect(result.medianLatencyMs).toBe(200);
  });

  it('computes p95 latency using nearest-rank method', () => {
    const observations = Array.from({ length: 20 }, (_, i) =>
      obs(i + 1, 'SUCCESS', { latencyMs: (i + 1) * 10 }),
    );
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    // 20 values 10..200; ceil(0.95*20)-1 = 18 (0-indexed) -> 190
    expect(result.p95LatencyMs).toBe(190);
  });
});

describe('computeReliabilityWindow — consecutive failures', () => {
  it('counts consecutive failures from the most recent observation backwards', () => {
    const observations = [
      obs(1, 'AGENT_UNREACHABLE'),
      obs(2, 'TIMEOUT'),
      obs(3, 'SUCCESS'),
      obs(4, 'AGENT_UNREACHABLE'),
    ];
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    expect(result.consecutiveFailures).toBe(2);
  });

  it('is zero when the most recent observation was a success', () => {
    const observations = [obs(1, 'SUCCESS'), obs(2, 'AGENT_UNREACHABLE')];
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    expect(result.consecutiveFailures).toBe(0);
  });
});

describe('computeReliabilityWindow — evidence sufficiency', () => {
  it('reports INSUFFICIENT with fewer than 3 observations', () => {
    const observations = [obs(1, 'SUCCESS'), obs(2, 'SUCCESS')];
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    expect(result.dataSufficiency).toBe('INSUFFICIENT');
    expect(result.sufficientData).toBe(false);
  });

  it('reports INSUFFICIENT when the newest observation is stale relative to the window', () => {
    // 30d window, but the only observations are from 25 days ago — nothing recent.
    const observations = [obs(25 * 24, 'SUCCESS'), obs(25 * 24 + 1, 'SUCCESS'), obs(25 * 24 + 2, 'SUCCESS')];
    const result = computeReliabilityWindow({ agentId: AGENT, window: '30d', observations, now: NOW });
    expect(result.dataSufficiency).toBe('INSUFFICIENT');
  });

  it('reports LIMITED with a handful of recent observations and low span coverage', () => {
    const observations = [obs(1, 'SUCCESS'), obs(1.5, 'SUCCESS'), obs(2, 'SUCCESS')];
    const result = computeReliabilityWindow({ agentId: AGENT, window: '30d', observations, now: NOW });
    expect(result.dataSufficiency).toBe('LIMITED');
  });

  it('reports STRONG with many observations spanning most of the window and recent data', () => {
    // 40 observations spread evenly across the last 23 of 24 hours (recent + wide span).
    const observations = Array.from({ length: 40 }, (_, i) => obs((i / 39) * 23, 'SUCCESS'));
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    expect(result.dataSufficiency).toBe('STRONG');
  });
});

describe('computeReliabilityWindow — scoping', () => {
  it('only includes observations for the requested agent', () => {
    const observations = [obs(1, 'SUCCESS'), obs(2, 'SUCCESS', { agentId: 'bsc:other' })];
    const result = computeReliabilityWindow({ agentId: AGENT, window: '24h', observations, now: NOW });
    expect(result.observationCount).toBe(1);
  });

  it('scopes to a specific service when serviceId is provided', () => {
    const observations = [obs(1, 'SUCCESS', { serviceId: 'svc-1' }), obs(2, 'SUCCESS', { serviceId: 'svc-2' })];
    const result = computeReliabilityWindow({
      agentId: AGENT,
      serviceId: 'svc-1',
      window: '24h',
      observations,
      now: NOW,
    });
    expect(result.observationCount).toBe(1);
  });
});
