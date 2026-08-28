import { describe, expect, it } from 'vitest';
import { ProbeRateLimiter } from './rate-limit';

describe('ProbeRateLimiter', () => {
  it('enforces per-host concurrency', async () => {
    const limiter = new ProbeRateLimiter({
      globalConcurrency: 10,
      perHostConcurrency: 2,
      minIntervalMsPerHost: 0,
    });
    const release1 = await limiter.acquire('a.test');
    const release2 = await limiter.acquire('a.test');

    let thirdAcquired = false;
    const thirdPromise = limiter.acquire('a.test').then((release) => {
      thirdAcquired = true;
      release();
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(thirdAcquired).toBe(false); // still blocked — 2 already in flight

    release1();
    await thirdPromise;
    expect(thirdAcquired).toBe(true);
    release2();
  });

  it('enforces global concurrency across hosts', async () => {
    const limiter = new ProbeRateLimiter({
      globalConcurrency: 1,
      perHostConcurrency: 5,
      minIntervalMsPerHost: 0,
    });
    const releaseA = await limiter.acquire('a.test');

    let bAcquired = false;
    const bPromise = limiter.acquire('b.test').then((release) => {
      bAcquired = true;
      release();
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(bAcquired).toBe(false); // global slot is taken by a.test

    releaseA();
    await bPromise;
    expect(bAcquired).toBe(true);
  });

  it('enforces a minimum interval between requests to the same host', async () => {
    const limiter = new ProbeRateLimiter({
      globalConcurrency: 10,
      perHostConcurrency: 10,
      minIntervalMsPerHost: 150,
    });
    const release1 = await limiter.acquire('a.test');
    release1();

    const start = Date.now();
    const release2 = await limiter.acquire('a.test');
    const elapsed = Date.now() - start;
    release2();

    expect(elapsed).toBeGreaterThanOrEqual(120); // allow small scheduling slack
  });

  it('enters cooldown after repeated failures and blocks acquisition during it', async () => {
    const limiter = new ProbeRateLimiter({
      cooldownFailureThreshold: 2,
      backoffBaseMs: 1000,
    });
    expect(limiter.isInCooldown('flaky.test')).toBe(false);

    limiter.recordFailure('flaky.test');
    expect(limiter.isInCooldown('flaky.test')).toBe(false); // below threshold

    limiter.recordFailure('flaky.test');
    expect(limiter.isInCooldown('flaky.test')).toBe(true); // threshold reached

    await expect(limiter.acquire('flaky.test')).rejects.toThrow(/cooldown/);
  });

  it('clears cooldown on a recorded success', async () => {
    const limiter = new ProbeRateLimiter({ cooldownFailureThreshold: 1, backoffBaseMs: 5000 });
    limiter.recordFailure('flaky2.test');
    expect(limiter.isInCooldown('flaky2.test')).toBe(true);

    limiter.recordSuccess('flaky2.test');
    expect(limiter.isInCooldown('flaky2.test')).toBe(false);
  });

  it('backs off exponentially with repeated consecutive failures', () => {
    const limiter = new ProbeRateLimiter({ cooldownFailureThreshold: 1, backoffBaseMs: 100, backoffMaxMs: 100_000 });
    limiter.recordFailure('backoff.test');
    const first = limiter.msUntilCooldownEnds('backoff.test');

    limiter.recordFailure('backoff.test');
    const second = limiter.msUntilCooldownEnds('backoff.test');

    expect(second).toBeGreaterThan(first);
  });
});
