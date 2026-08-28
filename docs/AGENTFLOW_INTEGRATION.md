# AgentFlow Integration (Reference Contract)

**Status: NOT integrated. AgentFlow does not consume AgentProof's API
today.** This document defines the contract AgentFlow (or any consumer)
should use once real integration happens — it is deliberately written
against the API that already exists and builds (see `docs/API.md`), so
that "wire it up" is the only remaining step once live data exists.
AgentFlow itself is not modified by this repository, per the build
prompt's original instruction.

## Read flow

1. AgentFlow has an ERC-8004 agent's chain + onchain id (or AgentProof's
   own `bsc:<id>` form, which AgentFlow can derive: `${chain}:${onchainId}`).
2. `GET /api/v1/agents/:chain/:id` — confirm the agent exists in
   AgentProof's index; if `404`, AgentProof has no evidence for this agent
   yet (see Fallback below).
3. `GET /api/v1/agents/:chain/:id/reliability` — the primary signal
   AgentFlow would show. **Check `dataSufficiency` on the specific window
   before displaying `availabilityPct`** — an `INSUFFICIENT` window should
   render as "not enough evidence yet," never as `0%` or a hidden/defaulted
   number.
4. Optionally `GET /api/v1/agents/:chain/:id/reputation-integrity` for the
   integrity-signal summary, with the same care around
   `dataSufficiency: INSUFFICIENT`.

## Response shape AgentFlow should expect

See `docs/API.md` for the full schema. The two fields every consumer
integration should key off of:

- `data.windows['24h'].dataSufficiency` (or `7d`/`30d`) — gates whether to
  show a number at all.
- `data.windows['24h'].availabilityPct` — absent (not `0`) when
  insufficient.

## Fallback behavior (AgentFlow's responsibility)

If AgentProof returns `404` for an agent, or a window's `dataSufficiency`
is `INSUFFICIENT`, AgentFlow should render an honest "no reliability data
yet" state — never fall back to a fabricated or default reliability
figure. This mirrors AgentProof's own rule in `docs/BNB_GRANT_EVIDENCE.md`
and section 31 of the original build prompt.

## Attribution

Any UI surface in AgentFlow displaying AgentProof-sourced evidence should
attribute it (e.g. "Reliability evidence via AgentProof") and link back to
the agent's AgentProof Passport page (`/agents/:chain/:id` once Phase H's
Passport UI is live) so the reader can see the full methodology, not just
a number in isolation.

## Cache policy

AgentProof's API sets `Cache-Control: s-maxage=30` on reliability/agent
routes (see `docs/API.md`) — AgentFlow can rely on that HTTP caching
directly, or apply its own shorter TTL; no polling faster than every 30s
is useful since the underlying data doesn't change faster than that.

## Error behavior

AgentProof's error envelope is stable (`{error:{code,message}}` — see
`docs/API.md`). AgentFlow should treat `NOT_FOUND` as "no evidence exists
yet" (not an error state to alarm the user about) and `INTERNAL_ERROR`/
network failures as "evidence temporarily unavailable" (distinct UI state
from "no evidence exists").

## When this becomes real

Tracked in `docs/BNB_GRANT_EVIDENCE.md` under "AgentFlow integration" —
status stays `NOT YET VERIFIED` until AgentFlow's codebase actually makes
a request against a deployed AgentProof API and that's demonstrable (a
live URL, not a code review).
