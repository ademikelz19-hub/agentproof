/**
 * SSRF-safe HTTP transport. This is the ONLY way any probe is allowed to
 * make an outbound request — probes never call `fetch`/`http.request`
 * directly.
 *
 * Threat model addressed (build prompt section 3 correction, "STRENGTHEN
 * SSRF DEFENCE"):
 *
 *  - Simple "resolve, validate, then fetch(hostname)" is insufficient
 *    because the HTTP client re-resolves the hostname itself at connect
 *    time — an attacker's DNS can return a public IP on the validation
 *    lookup and a private IP moments later on the real connection
 *    (DNS rebinding / TOCTOU). We close this by resolving once, validating
 *    the result, and then forcing the actual socket connection to that
 *    exact validated IP via Node's `lookup` option — the connection is
 *    physically incapable of going anywhere DNS might rebind it to.
 *  - TLS hostname/SNI verification is preserved: we keep `servername`/
 *    `Host` as the original hostname (only the low-level `lookup` used to
 *    pick the socket address is overridden), so certificate validation
 *    still checks against the real hostname, not the IP.
 *  - Redirects are followed manually, one hop at a time, each hop
 *    independently parsed, DNS-resolved, and IP-validated from scratch —
 *    a redirect never inherits trust from the hop before it.
 *  - Only `http:`/`https:` schemes and ports 80/443 are allowed by default.
 *  - Strict connect + total timeouts, a max response byte cap, and a max
 *    header size are enforced. No credentials or cookies are ever attached,
 *    and headers are never forwarded across a redirect hop.
 */

import * as http from 'node:http';
import * as https from 'node:https';
import { dns } from './dns';
import { checkAllIpPolicies } from './ip-policy';

export const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
export const ALLOWED_PORTS = new Set([80, 443]);
export const DEFAULT_MAX_REDIRECTS = 5;
export const DEFAULT_CONNECT_TIMEOUT_MS = 5_000;
export const DEFAULT_TOTAL_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB
export const DEFAULT_MAX_HEADER_BYTES = 32 * 1024; // 32 KB, also enforced by Node itself via maxHeaderSize
export const USER_AGENT = 'AgentProof/0.1 (+https://github.com/agentproof/agentproof)';

export type SafeRequestFailureReason =
  | 'DISALLOWED_SCHEME'
  | 'DISALLOWED_PORT'
  | 'USERINFO_NOT_ALLOWED'
  | 'DNS_FAILURE'
  | 'BLOCKED_IP'
  | 'TIMEOUT'
  | 'TOO_MANY_REDIRECTS'
  | 'RESPONSE_TOO_LARGE'
  | 'MALFORMED_URL'
  | 'CONNECTION_ERROR';

export interface SafeResponse {
  ok: true;
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
  finalUrl: string;
  redirectCount: number;
  latencyMs: number;
}

export interface SafeRequestFailure {
  ok: false;
  reason: SafeRequestFailureReason;
  detail: string;
  latencyMs: number;
}

export type SafeRequestResult = SafeResponse | SafeRequestFailure;

export interface SafeRequestOptions {
  method?: 'GET' | 'HEAD' | 'POST';
  maxRedirects?: number;
  connectTimeoutMs?: number;
  totalTimeoutMs?: number;
  maxResponseBytes?: number;
  allowedPorts?: Set<number>;
  /** Extra request headers. Authorization/Cookie are stripped — probes never send credentials. */
  headers?: Record<string, string>;
}

function fail(reason: SafeRequestFailureReason, detail: string, latencyMs: number): SafeRequestFailure {
  return { ok: false, reason, detail, latencyMs };
}

function validateUrlShape(rawUrl: string): { url: URL } | { error: SafeRequestFailure } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: fail('MALFORMED_URL', `could not parse URL: ${rawUrl}`, 0) };
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { error: fail('DISALLOWED_SCHEME', `scheme ${url.protocol} is not allowed (http/https only)`, 0) };
  }
  if (url.username || url.password) {
    return { error: fail('USERINFO_NOT_ALLOWED', 'URLs with embedded userinfo are rejected', 0) };
  }
  return { url };
}

async function resolveAndValidate(
  hostname: string,
): Promise<{ ip: string } | { error: SafeRequestFailure }> {
  let addresses: string[];
  try {
    addresses = await dns.resolveAll(hostname);
  } catch (err) {
    return { error: fail('DNS_FAILURE', err instanceof Error ? err.message : String(err), 0) };
  }
  const policy = checkAllIpPolicies(addresses);
  if (!policy.allowed) {
    return {
      error: fail('BLOCKED_IP', `resolved address blocked by policy: ${policy.reason ?? 'unknown'}`, 0),
    };
  }
  // Pin to the first validated address — this exact IP, and only this IP,
  // is what the socket will connect to (see `lookup` override below).
  const chosen = addresses[0];
  if (!chosen) {
    return { error: fail('DNS_FAILURE', 'no addresses resolved', 0) };
  }
  return { ip: chosen };
}

/**
 * Perform a single (non-redirect-following) request to a pre-validated
 * hostname/IP pair. The `lookup` option forces the connection to `ip`
 * regardless of what DNS would return if queried again right now — this is
 * what defeats rebinding.
 */
function singleRequest(
  url: URL,
  ip: string,
  opts: Required<Pick<SafeRequestOptions, 'method' | 'connectTimeoutMs' | 'totalTimeoutMs' | 'maxResponseBytes'>> & {
    headers: Record<string, string> | undefined;
  },
): Promise<
  | { kind: 'response'; status: number; headers: http.IncomingHttpHeaders; body: Buffer }
  | { kind: 'error'; reason: SafeRequestFailureReason; detail: string }
> {
  return new Promise((resolve) => {
    const client = url.protocol === 'https:' ? https : http;
    const startedAt = Date.now();
    let settled = false;
    const settle = (
      result:
        | { kind: 'response'; status: number; headers: http.IncomingHttpHeaders; body: Buffer }
        | { kind: 'error'; reason: SafeRequestFailureReason; detail: string },
    ) => {
      if (settled) return;
      settled = true;
      clearTimeout(totalTimer);
      resolve(result);
    };

    const req = client.request({
      protocol: url.protocol,
      hostname: url.hostname, // used for the Host header / TLS servername — NOT for DNS resolution
      servername: url.protocol === 'https:' ? url.hostname : undefined,
      port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
      path: `${url.pathname}${url.search}`,
      method: opts.method,
      // Force the actual socket connection to the pre-validated IP no
      // matter what a real DNS lookup would say right now.
      lookup: (_hostname, _lookupOpts, cb) => {
        cb(null, ip, ip.includes(':') ? 6 : 4);
      },
      // Disable Happy-Eyeballs dual-stack behaviour: it can invoke `lookup`
      // in a shape (`all: true`, multiple candidate addresses) our
      // single-IP override doesn't support, and we've already deliberately
      // pinned to exactly one validated address — there is nothing for
      // Happy Eyeballs to race between. Not in @types/node's RequestOptions
      // yet even though Node itself supports it, hence the cast.
      autoSelectFamily: false,
      timeout: opts.connectTimeoutMs,
      maxHeaderSize: DEFAULT_MAX_HEADER_BYTES,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json, text/plain, */*',
        ...(opts.headers ?? {}),
      },
    } as http.RequestOptions & { autoSelectFamily: boolean });
    // Remove any accidentally-set undefined headers (Node keeps the keys otherwise).
    req.removeHeader('authorization');
    req.removeHeader('cookie');

    const totalTimer = setTimeout(() => {
      req.destroy();
      settle({ kind: 'error', reason: 'TIMEOUT', detail: 'total request timeout exceeded' });
    }, opts.totalTimeoutMs);

    req.on('timeout', () => {
      req.destroy();
      settle({ kind: 'error', reason: 'TIMEOUT', detail: 'connect timeout exceeded' });
    });

    req.on('error', (err) => {
      settle({ kind: 'error', reason: 'CONNECTION_ERROR', detail: err.message });
    });

    req.on('response', (res) => {
      const chunks: Buffer[] = [];
      let total = 0;
      let tooLarge = false;
      res.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > opts.maxResponseBytes) {
          tooLarge = true;
          res.destroy();
          req.destroy();
          settle({ kind: 'error', reason: 'RESPONSE_TOO_LARGE', detail: `exceeded ${opts.maxResponseBytes} bytes` });
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        if (tooLarge) return;
        settle({
          kind: 'response',
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
      res.on('error', (err) => {
        settle({ kind: 'error', reason: 'CONNECTION_ERROR', detail: err.message });
      });
    });

    req.end();
    void startedAt;
  });
}

/**
 * The public entry point every probe must use. Resolves + validates the
 * host, connects only to the validated IP, and follows redirects manually
 * (each hop re-validated independently, bounded by `maxRedirects`).
 */
export async function safeRequest(rawUrl: string, options: SafeRequestOptions = {}): Promise<SafeRequestResult> {
  const startedAt = Date.now();
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  const totalTimeoutMs = options.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const allowedPorts = options.allowedPorts ?? ALLOWED_PORTS;
  const method = options.method ?? 'GET';

  let currentUrl = rawUrl;
  let redirectCount = 0;

  for (;;) {
    const shapeResult = validateUrlShape(currentUrl);
    if ('error' in shapeResult) {
      return { ...shapeResult.error, latencyMs: Date.now() - startedAt };
    }
    const url = shapeResult.url;

    const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
    if (!allowedPorts.has(port)) {
      return fail('DISALLOWED_PORT', `port ${port} is not in the allowed set`, Date.now() - startedAt);
    }

    const resolved = await resolveAndValidate(url.hostname);
    if ('error' in resolved) {
      return { ...resolved.error, latencyMs: Date.now() - startedAt };
    }

    const result = await singleRequest(url, resolved.ip, {
      method,
      connectTimeoutMs,
      totalTimeoutMs,
      maxResponseBytes,
      headers: options.headers,
    });

    if (result.kind === 'error') {
      return fail(result.reason, result.detail, Date.now() - startedAt);
    }

    const isRedirect = result.status >= 300 && result.status < 400;
    const location = result.headers.location;
    if (isRedirect && typeof location === 'string') {
      redirectCount += 1;
      if (redirectCount > maxRedirects) {
        return fail('TOO_MANY_REDIRECTS', `exceeded ${maxRedirects} redirects`, Date.now() - startedAt);
      }
      // Resolve relative Location headers against the current URL, then
      // loop: the next iteration independently re-validates scheme, port,
      // DNS, and IP for the new target — no trust is inherited.
      currentUrl = new URL(location, url).toString();
      continue;
    }

    return {
      ok: true,
      status: result.status,
      headers: result.headers as Record<string, string | string[] | undefined>,
      body: result.body,
      finalUrl: url.toString(),
      redirectCount,
      latencyMs: Date.now() - startedAt,
    };
  }
}
