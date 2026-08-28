/**
 * Ethical-probing controls (build prompt sections 7 & 19 / correction 7).
 * AgentProof must never become a source of load against the agents it
 * monitors. This module enforces:
 *
 *  - a global concurrency cap across all probes
 *  - a per-host concurrency cap
 *  - a minimum interval between requests to the same host
 *  - exponential backoff + a failure cooldown window after repeated
 *    failures against a host, so an unhealthy endpoint isn't hammered
 */

export interface RateLimiterOptions {
  globalConcurrency?: number;
  perHostConcurrency?: number;
  minIntervalMsPerHost?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
  cooldownFailureThreshold?: number;
}

interface HostState {
  inFlight: number;
  lastRequestAt: number;
  consecutiveFailures: number;
  cooldownUntil: number;
}

export class ProbeRateLimiter {
  private readonly opts: Required<RateLimiterOptions>;
  private globalInFlight = 0;
  private readonly hosts = new Map<string, HostState>();
  private readonly waiters: Array<() => void> = [];

  constructor(opts: RateLimiterOptions = {}) {
    this.opts = {
      globalConcurrency: opts.globalConcurrency ?? 10,
      perHostConcurrency: opts.perHostConcurrency ?? 2,
      minIntervalMsPerHost: opts.minIntervalMsPerHost ?? 5_000,
      backoffBaseMs: opts.backoffBaseMs ?? 1_000,
      backoffMaxMs: opts.backoffMaxMs ?? 5 * 60_000,
      cooldownFailureThreshold: opts.cooldownFailureThreshold ?? 3,
    };
  }

  private getHost(host: string): HostState {
    let state = this.hosts.get(host);
    if (!state) {
      state = { inFlight: 0, lastRequestAt: 0, consecutiveFailures: 0, cooldownUntil: 0 };
      this.hosts.set(host, state);
    }
    return state;
  }

  /** Whether `host` is currently in a failure cooldown window (should be skipped this cycle, not queued). */
  isInCooldown(host: string): boolean {
    const state = this.getHost(host);
    return Date.now() < state.cooldownUntil;
  }

  msUntilCooldownEnds(host: string): number {
    const state = this.getHost(host);
    return Math.max(0, state.cooldownUntil - Date.now());
  }

  recordSuccess(host: string): void {
    const state = this.getHost(host);
    state.consecutiveFailures = 0;
    state.cooldownUntil = 0;
  }

  recordFailure(host: string): void {
    const state = this.getHost(host);
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= this.opts.cooldownFailureThreshold) {
      const exponent = state.consecutiveFailures - this.opts.cooldownFailureThreshold;
      const backoff = Math.min(this.opts.backoffBaseMs * 2 ** exponent, this.opts.backoffMaxMs);
      state.cooldownUntil = Date.now() + backoff;
    }
  }

  /**
   * Acquire a slot to probe `host`, respecting global concurrency, per-host
   * concurrency, and the minimum inter-request interval. Resolves to a
   * release function that MUST be called when the request completes.
   * Throws if the host is currently in a failure cooldown — callers should
   * check `isInCooldown` first and skip rather than await this in that case.
   */
  async acquire(host: string): Promise<() => void> {
    if (this.isInCooldown(host)) {
      throw new Error(`host ${host} is in failure cooldown for ${this.msUntilCooldownEnds(host)}ms`);
    }

    // Wait for global + per-host concurrency headroom.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const state = this.getHost(host);
      const globalOk = this.globalInFlight < this.opts.globalConcurrency;
      const hostOk = state.inFlight < this.opts.perHostConcurrency;
      const sinceLast = Date.now() - state.lastRequestAt;
      const intervalOk = state.lastRequestAt === 0 || sinceLast >= this.opts.minIntervalMsPerHost;

      if (globalOk && hostOk && intervalOk) {
        this.globalInFlight += 1;
        state.inFlight += 1;
        state.lastRequestAt = Date.now();
        let released = false;
        return () => {
          if (released) return;
          released = true;
          this.globalInFlight -= 1;
          state.inFlight -= 1;
        };
      }

      const waitMs = intervalOk ? 25 : this.opts.minIntervalMsPerHost - sinceLast;
      await new Promise((resolve) => setTimeout(resolve, Math.max(10, waitMs)));
    }
  }
}
