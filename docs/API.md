# Developer API — v1

Base path: `/api/v1`. All routes are `GET` — there is no public write path.
Measurements are only ever written by trusted probe-execution code (see
`docs/SECURITY_MODEL.md`), never through this API.

**Current status: the API is live in the codebase and builds/runs, but no
database is connected in this environment** — every route currently
returns real, honest empty results (`items: []`, `404` for any specific
agent) rather than fabricated data. See `docs/ENVIRONMENT_BASELINE.md` and
`docs/BNB_GRANT_EVIDENCE.md`.

## Response envelope

Every successful response:

```json
{ "data": { /* route-specific */ }, "generatedAt": "2026-08-28T09:19:33.807Z" }
```

Every error response (stable schema across all routes):

```json
{ "error": { "code": "NOT_FOUND", "message": "No agent xyz on chain bsc" } }
```

`code` is one of `NOT_FOUND` (404), `VALIDATION_ERROR` (400),
`METHOD_NOT_ALLOWED` (405), `INTERNAL_ERROR` (500).

## Pagination

List routes accept `?limit=` (default 25, max **100** — hard-capped
server-side, oversized requests get `VALIDATION_ERROR`) and `?cursor=`
(opaque, returned as `nextCursor` in the previous page — absent when there
are no more pages).

## Null semantics

Missing data is never presented as zero or a default value:

- No reliability evidence for a window → the window's `availabilityPct`,
  `medianLatencyMs`, etc. are simply absent from the JSON (not `0`).
- No reputation data for an agent → check `feedbackAvailability` first.
  `NOT_INGESTED`/`UPSTREAM_UNAVAILABLE`/`UNSUPPORTED` mean AgentProof has
  no analysis to show (and carries no `feedbackCount`/`dataSufficiency` at
  all); `AVAILABLE` with `feedbackCount: 0` is a different, genuine fact —
  AgentProof checked and found none. Never treat these as
  interchangeable. See `docs/REPUTATION_INTEGRITY.md` "Feedback
  availability semantics."
- No agent metadata resolved → `metadata: null`, not an empty-string name.
  Similarly, an empty `services` array only means "no services declared"
  when `metadata.metadataResolved === true` — if metadata hasn't resolved
  yet, an empty services list means "unknown," not "zero declared." Check
  `metadataResolved` before treating an empty services array as meaningful.

## Routes

### `GET /api/v1/agents`

List known agents.

Query: `chain` (optional, e.g. `bsc`), `limit`, `cursor`.

```json
// EXAMPLE RESPONSE — NOT PRODUCTION DATA
{
  "data": {
    "items": [
      { "id": "bsc:1", "chain": "bsc", "onchainId": "1", "provenance": { "source": "ONCHAIN", "origin": "bsc-rpc", "observedAt": "..." } }
    ],
    "nextCursor": "bsc:1"
  },
  "generatedAt": "..."
}
```

### `GET /api/v1/agents/:chain/:id`

Single agent identity + metadata. 404 if not found.

```json
// EXAMPLE RESPONSE — NOT PRODUCTION DATA
{ "data": { "identity": { "id": "bsc:1", "chain": "bsc", "onchainId": "1", "provenance": {...} }, "metadata": null }, "generatedAt": "..." }
```

### `GET /api/v1/agents/:chain/:id/services`

Advertised services for the agent (normalized, `services` form preferred
over legacy `endpoints`, see `docs/ARCHITECTURE.md`). 404 if the agent
itself isn't found; an empty `services` array if the agent exists but
declared none.

### `GET /api/v1/agents/:chain/:id/reliability`

Computed `24h`/`7d`/`30d` reliability windows (see
`docs/RELIABILITY_METHODOLOGY.md` for the formulas). Every window carries
`dataSufficiency` — **check it before trusting `availabilityPct`.**

```json
// EXAMPLE RESPONSE — NOT PRODUCTION DATA
{
  "data": {
    "windows": {
      "24h": { "window": "24h", "dataSufficiency": "INSUFFICIENT", "sufficientData": false, "observationCount": 0, "successCount": 0, "failureCount": 0, "consecutiveFailures": 0, "methodologyVersion": "0.1.0", "computedAt": "..." },
      "7d": { "...": "..." },
      "30d": { "...": "..." }
    }
  },
  "generatedAt": "..."
}
```

### `GET /api/v1/agents/:chain/:id/observations`

Paginated raw observation timeline. Query: `since`, `until` (ISO 8601,
default to all time), `serviceId` (optional), `limit`, `cursor`.

### `GET /api/v1/agents/:chain/:id/reputation-integrity`

Computed reputation-integrity evidence (see
`docs/REPUTATION_INTEGRITY.md`). Never a trust score — see that doc for
what each signal does and does not mean. **Check `feedbackAvailability`
before reading any other field** — only `AVAILABLE` results carry
`feedbackCount`/`dataSufficiency`/etc.

```json
// EXAMPLE RESPONSE — NOT PRODUCTION DATA (feedback not yet ingested)
{ "data": { "feedbackAvailability": "NOT_INGESTED", "integritySignals": [], "methodologyVersion": "0.1.0", "computedAt": "...", "provenance": {...} }, "generatedAt": "..." }
```

```json
// EXAMPLE RESPONSE — NOT PRODUCTION DATA (feedback ingested, genuinely zero records)
{ "data": { "feedbackAvailability": "AVAILABLE", "feedbackCount": 0, "uniqueReviewerCount": 0, "dataSufficiency": "INSUFFICIENT", "integritySignals": [], "methodologyVersion": "0.1.0", "computedAt": "...", "provenance": {...} }, "generatedAt": "..." }
```

### `GET /api/v1/methodology`

Current methodology versions and links to the human-readable docs. Useful
for a consumer to detect when AgentProof's calculation rules have changed.

```json
{
  "data": {
    "methodologyVersions": { "probe": "0.1.0", "reliability": "0.1.0", "reputationIntegrity": "0.1.0" },
    "documentation": { "reliability": "/methodology#reliability", "reputationIntegrity": "/methodology#reputation-integrity", "probePolicy": "/methodology#probe-policy" }
  },
  "generatedAt": "..."
}
```

## Caching

Read routes set `Cache-Control: public, max-age=0, s-maxage=N, stale-while-revalidate=N`
(30s for per-agent data, 60s for reputation, 300s for the rarely-changing
methodology route) — safe because all routes are read-only and idempotent.

## Not yet built

- Authentication/API keys — not required for V0's public read API.
- Bulk/enterprise feed endpoints (see `docs/BUSINESS_MODEL.md`'s Enterprise
  tier) — a later phase, not V0.
