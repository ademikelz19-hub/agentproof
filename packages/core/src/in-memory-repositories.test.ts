import { describe, expect, it } from 'vitest';
import type { ProbeObservation } from './domain';
import { InMemoryObservationRepository } from './in-memory-repositories';

function makeObservation(id: string, timestamp: string): ProbeObservation {
  return {
    id,
    agentId: 'bsc:1',
    chain: 'bsc',
    serviceId: 'svc-1',
    probeType: 'SERVICE_REACHABILITY',
    timestamp,
    outcome: 'SUCCESS',
    provenance: { source: 'AGENTPROOF_MEASUREMENT', origin: 'test', observedAt: timestamp },
    probeVersion: '0.1.0',
    methodologyVersion: '0.1.0',
  };
}

describe('ObservationRepository — append-only enforcement', () => {
  it('has no update/delete method on the interface — recordObservation only ever appends', async () => {
    const repo = new InMemoryObservationRepository();
    await repo.recordObservation(makeObservation('o1', '2026-08-01T00:00:00.000Z'));
    await repo.recordObservation(makeObservation('o1', '2026-08-02T00:00:00.000Z')); // same id, later timestamp

    const page = await repo.listObservations({
      agentId: 'bsc:1',
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-12-31T00:00:00.000Z',
      limit: 10,
    });

    // Both rows exist — the second call did not overwrite the first. This
    // is what "append-only" means at the application layer: there is no
    // code path that could have replaced the earlier row even by accident.
    expect(page.items).toHaveLength(2);
  });

  it('lists observations sorted newest first', async () => {
    const repo = new InMemoryObservationRepository();
    await repo.recordObservation(makeObservation('o1', '2026-08-01T00:00:00.000Z'));
    await repo.recordObservation(makeObservation('o2', '2026-08-03T00:00:00.000Z'));
    await repo.recordObservation(makeObservation('o3', '2026-08-02T00:00:00.000Z'));

    const page = await repo.listObservations({
      agentId: 'bsc:1',
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-12-31T00:00:00.000Z',
      limit: 10,
    });
    expect(page.items.map((o) => o.id)).toEqual(['o2', 'o3', 'o1']);
  });
});

describe('ObservationRepository — pagination', () => {
  it('paginates with a cursor and reports nextCursor only when more remain', async () => {
    const repo = new InMemoryObservationRepository();
    for (let i = 0; i < 5; i++) {
      await repo.recordObservation(makeObservation(`o${i}`, `2026-08-0${i + 1}T00:00:00.000Z`));
    }

    const firstPage = await repo.listObservations({
      agentId: 'bsc:1',
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-12-31T00:00:00.000Z',
      limit: 2,
    });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.nextCursor).toBeDefined();

    const secondPage = await repo.listObservations({
      agentId: 'bsc:1',
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-12-31T00:00:00.000Z',
      limit: 2,
      cursor: firstPage.nextCursor,
    });
    expect(secondPage.items).toHaveLength(2);

    const thirdPage = await repo.listObservations({
      agentId: 'bsc:1',
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-12-31T00:00:00.000Z',
      limit: 2,
      cursor: secondPage.nextCursor,
    });
    expect(thirdPage.items).toHaveLength(1);
    expect(thirdPage.nextCursor).toBeUndefined(); // no more pages
  });

  it('scopes to the requested time window', async () => {
    const repo = new InMemoryObservationRepository();
    await repo.recordObservation(makeObservation('old', '2020-01-01T00:00:00.000Z'));
    await repo.recordObservation(makeObservation('recent', '2026-08-01T00:00:00.000Z'));

    const page = await repo.listObservations({
      agentId: 'bsc:1',
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-12-31T00:00:00.000Z',
      limit: 10,
    });
    expect(page.items.map((o) => o.id)).toEqual(['recent']);
  });
});
