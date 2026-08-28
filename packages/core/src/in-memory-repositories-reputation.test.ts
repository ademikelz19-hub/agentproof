import { describe, expect, it } from 'vitest';
import type { FeedbackRecord } from './domain';
import { InMemoryReputationRepository } from './in-memory-repositories';

function fb(reviewerId: string, agentId = 'bsc:1'): FeedbackRecord {
  return {
    agentId,
    reviewerId,
    timestamp: '2026-08-01T00:00:00.000Z',
    provenance: { source: 'INDEXER', origin: 'test', observedAt: '2026-08-01T00:00:00.000Z' },
  };
}

describe('InMemoryReputationRepository — feedback availability status', () => {
  it('defaults to NOT_INGESTED when constructed with no arguments', async () => {
    const repo = new InMemoryReputationRepository();
    const result = await repo.listFeedback('bsc:1');
    expect(result.status).toBe('NOT_INGESTED');
    expect(result.records).toHaveLength(0);
  });

  it('reports AVAILABLE with zero records when explicitly seeded as such — distinct from NOT_INGESTED', async () => {
    const repo = new InMemoryReputationRepository([], 'AVAILABLE');
    const result = await repo.listFeedback('bsc:1');
    expect(result.status).toBe('AVAILABLE');
    expect(result.records).toHaveLength(0);
  });

  it('reports AVAILABLE with real records when seeded with data', async () => {
    const repo = new InMemoryReputationRepository([fb('r1'), fb('r2')], 'AVAILABLE');
    const result = await repo.listFeedback('bsc:1');
    expect(result.status).toBe('AVAILABLE');
    expect(result.records).toHaveLength(2);
  });

  it('never returns records for a non-AVAILABLE status, even if the constructor was seeded with data', async () => {
    // A repository shouldn't ordinarily be constructed this way, but the
    // implementation must not leak seeded records through a non-AVAILABLE
    // status regardless.
    const repo = new InMemoryReputationRepository([fb('r1')], 'UPSTREAM_UNAVAILABLE');
    const result = await repo.listFeedback('bsc:1');
    expect(result.status).toBe('UPSTREAM_UNAVAILABLE');
    expect(result.records).toHaveLength(0);
  });

  it('scopes AVAILABLE records to the requested agent', async () => {
    const repo = new InMemoryReputationRepository([fb('r1', 'bsc:1'), fb('r2', 'bsc:2')], 'AVAILABLE');
    const result = await repo.listFeedback('bsc:1');
    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.reviewerId).toBe('r1');
  });
});
