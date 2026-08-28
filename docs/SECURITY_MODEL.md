# Security Model

AgentProof's probe engine makes outbound HTTP requests to URLs advertised
by third parties (agent metadata). That is a serious SSRF surface: without
protection, "check whether this agent's endpoint responds" is
indistinguishable from "let an attacker use AgentProof's server as a proxy
onto internal networks and cloud metadata services." This document
describes the defense implemented in `packages/probes/src/transport.ts`
and `ip-policy.ts`, and states its known limitations honestly.

## Threat model

An attacker controls the content of ERC-8004 agent metadata (a `url`
field) and can also control DNS for a domain they register. Given that,
they can attempt to make AgentProof's probe:

1. Connect directly to a private/internal/loopback/cloud-metadata address.
2. Pass an initial DNS-resolution check with a public IP, then have DNS
   answer a *different*, private IP by the time the actual HTTP client
   connects ("DNS rebinding" / TOCTOU).
3. Redirect a legitimate first hop to a private-address second hop.
4. Cause AgentProof to download an unbounded response, hang a probe
   indefinitely, or hammer a target with unbounded concurrency.
5. Use a non-HTTP scheme (`file:`, `data:`, `gopher:`, etc.) or a
   non-standard port to reach something unintended.
6. Have AgentProof forward credentials or cookies somewhere they were
   never meant to go.

## Defenses, mapped to the threats above

**1. Direct private-address connection — blocked by `ip-policy.ts`.**
Every resolved address is classified with `ipaddr.js` (not hand-rolled
string/prefix matching) and rejected if it falls in: loopback, RFC1918
private, link-local (which covers `169.254.169.254`, the common cloud
metadata address), carrier-grade NAT (100.64.0.0/10), multicast, reserved,
unspecified/broadcast — and the IPv6 equivalents (`::1`, `fe80::/10`,
`fc00::/7`/ULA, multicast, unspecified, reserved). IPv4-mapped IPv6
addresses (`::ffff:127.0.0.1`) are unwrapped to their embedded IPv4 address
and re-checked, so they can't smuggle a blocked address past an IPv6-only
check.

**2. DNS rebinding — closed by connection pinning, not by "check then
hope."** `safeRequest` resolves the hostname once via `dns.resolveAll`,
validates every returned address, and then passes a custom `lookup`
function into Node's `http.request`/`https.request` options that always
returns that exact validated IP — regardless of what a fresh DNS query
would say at connect time. The TLS `servername` and the HTTP `Host` header
still use the original hostname (not the IP), so certificate
hostname verification is unaffected. Happy-Eyeballs dual-stack behaviour
(`autoSelectFamily`) is explicitly disabled, since it can invoke `lookup`
in a shape our single-address override doesn't support and there is
nothing to race between once we've already pinned to one address.

**3. Redirect-based bypass — each hop is independently re-validated.**
`safeRequest` never lets the underlying HTTP client auto-follow redirects.
It reads the `Location` header itself, resolves it against the current
URL, and loops — which means the new URL goes through the *entire*
pipeline again from scratch (scheme check, port check, DNS resolution,
IP-policy check). A redirect to a private IP or to `file:`/other schemes
is rejected exactly like a direct request would be. Redirects are bounded
by `maxRedirects` (default 5); exceeding it fails closed.

**4. Resource exhaustion — timeouts and a size cap.** A connect timeout
and a total-request timeout are both enforced (defaults 5s / 10s), and the
response body is capped at 2MB — the socket is destroyed mid-stream if
that's exceeded rather than buffering an unbounded body. Header size is
capped via Node's `maxHeaderSize`. Concurrency is separately bounded by
`ProbeRateLimiter` (see Probe Policy) so this isn't just per-request
safety but also protects against AgentProof itself becoming a load source.

**5. Scheme/port restriction — allowlist, not denylist.** Only `http:`
and `https:` are accepted; everything else (`file:`, `data:`, `ftp:`,
`gopher:`, `ws:`, `wss:`, `javascript:`, unknown schemes) is rejected
before any network activity happens. Only ports 80 and 443 are allowed by
default. URLs with embedded userinfo (`http://user:pass@host/`) are
rejected outright, since that's a common SSRF/parsing-confusion vector.

**6. Credential hygiene.** Probes never attach an `Authorization` or
`Cookie` header — a caller-supplied one is explicitly stripped
(`req.removeHeader`) rather than trusted, and nothing is ever carried
across a redirect hop (each hop builds its own fresh request). Probes
identify themselves honestly via `User-Agent: AgentProof/0.1 (+repo URL)`.

## What this does NOT protect against (be honest about limits)

- **A public IP that later becomes malicious infrastructure.** AgentProof
  validates IP *ranges*, not reputation. A public server that later hosts
  something abusive is not something this layer catches — that's a
  different (out-of-scope-for-V0) problem.
- **Extremely short-lived DNS answers that resolve differently between our
  resolution and a hypothetical middlebox's independent resolution.** We
  eliminate rebinding for AgentProof's own connection because we pin the
  socket ourselves — but if something *else* in the request path (a
  transparent proxy, corporate DNS interception) does its own independent
  resolution outside our control, that is outside what application-level
  pinning can fix.
- **Application-layer SSRF via the target's own response**, e.g. a
  redirect embedded in a response *body* rather than a `Location` header
  (we don't parse HTML/JS for meta-refresh or JS-based redirects — we only
  follow HTTP-level redirects).
- **The dev-only `esbuild`/`vite`/`vitest` toolchain vulnerability**
  (GHSA-67mh-4wv8-2f99, moderate) — affects the local Vitest dev server
  only, not anything shipped to production; `npm audit --omit=dev` is
  clean. Left unresolved for V0 because upgrading is a breaking Vitest
  major-version change; tracked for a deliberate follow-up rather than a
  forced upgrade under time pressure.

## Security review — Phase D–H addition (DB, API, UI)

Re-reviewed after adding the database schema/repositories, the read-only
API, and the product UI, specifically for the concerns the build prompt
called out:

- **SQL injection**: not applicable in the current code path — the
  Drizzle repository layer (`packages/db/src/drizzle-repositories.ts`)
  uses Drizzle's query builder exclusively (`eq`, `and`, `gte`, `lte`,
  `lt`), never a raw `sql\`...\`` template with interpolated values.
  Confirmed by grep: no raw SQL template usage anywhere in `packages/db`.
- **ID/param validation**: every dynamic API route (`[chain]/[id]` and
  its sub-routes) runs the route params through `parseAgentParams` (a zod
  schema restricting `chain` to the supported-chain enum and `id` to a
  bounded-length string) before any repository call. Confirmed by grep:
  all 5 dynamic routes call it.
- **Pagination abuse**: `limit` is bounded to 100 server-side via zod
  (`paginationQuerySchema`) — confirmed live: `?limit=999` returns
  `VALIDATION_ERROR`, not a truncated-silently response.
- **Public write paths**: confirmed by grep — no route in
  `apps/web/app/api` exports `POST`/`PUT`/`DELETE`/`PATCH`. Every route is
  `GET`-only. The only place `recordObservation`/`recordReputationEvidence`/
  `recordIntegritySignals` are called is from within the repository
  implementations themselves — nothing in the API layer calls them.
- **Information leakage**: error responses use the stable
  `{error:{code,message}}` schema with a short, non-sensitive message
  (e.g. "No agent X on chain Y") — no stack traces, no internal paths, no
  raw exception text are ever serialized into an API response.
- **Secret exposure**: no API keys, DB credentials, or secrets exist
  anywhere in this codebase — there is no live database connection
  configured yet (see `docs/ENVIRONMENT_BASELINE.md`), so there is
  currently nothing to leak.
- **XSS from agent-controlled metadata**: agent `name`/`description` are
  rendered as plain JSX text content (React escapes this by default —
  never `dangerouslySetInnerHTML`, confirmed absent by grep across
  `apps/web`). Agent-declared service URLs are rendered exclusively
  through `SafeExternalLink`, which parses the URL and only emits a real
  `<a href>` for `http:`/`https:` schemes — anything else (including
  `javascript:`) renders as inert monospace text, never a clickable link.
  Confirmed by grep: no raw `href={svc...}`/`href={agent...}` construction
  exists outside that component.

No new findings requiring a code change resulted from this pass — the
items above were designed in from the start rather than retrofitted, and
this section exists to record that they were explicitly re-checked, not
just assumed.

## Not yet implemented (explicitly out of scope so far)

- A public opt-out/contact mechanism for agent operators (mentioned in
  Probe Policy as a future addition).
- Protocol-specific validators for A2A/MCP beyond generic HTTP reachability
  (see `probeProtocolResponseValidity` — it honestly reports
  `PROTOCOL_INVALID` with "no validator implemented" for those, rather than
  guessing).

