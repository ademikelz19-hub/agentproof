# Probe Policy

AgentProof monitors third-party infrastructure it does not own or operate.
This document describes how probing is kept conservative and honest, and
is the policy `packages/probes/src/rate-limit.ts` and `transport.ts`
implement.

## Identity

Every probe request identifies itself with an honest User-Agent:

```
AgentProof/0.1 (+https://github.com/agentproof/agentproof)
```

AgentProof never masquerades as a browser, search-engine crawler, or any
other client. If an agent operator wants to see who's probing them and why,
the User-Agent string is the starting point (the linked repository URL is
a placeholder until the project has a real public repository — update this
string when it does).

## Concurrency limits

`ProbeRateLimiter` enforces two independent caps:

- **Global concurrency** (default 10): the total number of in-flight probe
  requests across all agents/hosts at once.
- **Per-host concurrency** (default 2): the number of in-flight requests
  to any single host at once, regardless of global headroom. This is what
  actually protects an individual agent's infrastructure — a large global
  limit alone wouldn't prevent hammering one specific host.

## Minimum interval

A minimum interval between requests to the same host (default 5s) is
enforced independently of concurrency — even with headroom available, a
second request to the same host won't fire before the interval elapses.

## Backoff and cooldown

After `cooldownFailureThreshold` (default 3) consecutive failures against
a host, that host enters a cooldown window before any further requests are
attempted — the cooldown duration grows exponentially with each additional
consecutive failure (bounded by `backoffMaxMs`, default 5 minutes) so a
consistently-unhealthy endpoint is probed less and less often rather than
retried at a fixed cadence forever. A single recorded success clears the
failure count and any active cooldown immediately.

Callers are expected to check `isInCooldown(host)` before attempting to
`acquire()` a slot — `acquire()` throws if called on a host currently in
cooldown, precisely so the scheduler skips cooldown hosts rather than
queuing behind them.

## What counts as "safe" probing

- All probe HTTP methods are read-only (`GET`/`HEAD`) — never `POST`,
  `PUT`, `DELETE`, or anything state-changing.
- Every probe request goes through the SSRF-safe transport (see
  `docs/SECURITY_MODEL.md`) — strict timeouts, a response-size cap, and no
  credential forwarding.
- No probe is capable of signing a transaction or spending funds — there
  is no wallet or private-key material anywhere in `packages/probes`.
- Probes never retry an individual failed request inline; a failure is
  simply recorded as an observation, and the *next scheduled probe run*
  (subject to backoff/cooldown above) is what retries, not the current
  one looping.

## Not yet implemented

- A public, documented opt-out mechanism for agent operators who don't
  want to be monitored (e.g. a `robots.txt`-style convention or a contact
  address in the User-Agent). This is planned but out of scope for
  Phase A–C, which does not yet include a deployed, publicly-reachable
  probe scheduler.
- Respecting `robots.txt` itself — AgentProof's probes are not web
  crawlers in the traditional sense (they check a single declared service
  endpoint per agent, not a whole site), so this needs a deliberate design
  decision rather than blindly inheriting crawler conventions; not
  resolved yet.
