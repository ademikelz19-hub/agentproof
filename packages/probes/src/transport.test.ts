import * as http from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startTestServer, type TestServer } from './test-utils/test-server';

// The real ip-policy module correctly blocks 127.0.0.1 (that's the whole
// point of SSRF defence) — but these tests need a real, connectable server,
// and the only server we can stand up in this sandbox lives on loopback.
// So: special-case 127.0.0.1 as "allowed" here, and delegate every other
// address to the REAL policy implementation unchanged. This means the
// "redirect to a private IP gets blocked" test below is still exercising
// genuine production blocking logic — only the test harness's own loopback
// server is exempted.
vi.mock('./ip-policy.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ip-policy.js')>();
  return {
    ...actual,
    checkAllIpPolicies: (ips: string[]) => {
      if (ips.length > 0 && ips.every((ip) => ip === '127.0.0.1')) {
        return { allowed: true as const };
      }
      return actual.checkAllIpPolicies(ips);
    },
  };
});

const dnsMap = new Map<string, string[]>();

vi.mock('./dns.js', () => ({
  dns: {
    resolveAll: async (hostname: string) => {
      const mapped = dnsMap.get(hostname);
      if (mapped) return mapped;
      throw new Error(`no DNS mapping configured for ${hostname} in this test`);
    },
  },
}));

// Imported AFTER the mocks are registered.
const { safeRequest: rawSafeRequest } = await import('./transport.js');
import type { SafeRequestOptions, SafeRequestResult } from './transport';

// Test convenience wrapper: the real default port allowlist is 80/443,
// but the local test server binds an ephemeral port, so tests explicitly
// allow that one port rather than loosening the production default.
function safeRequest(url: string, opts: SafeRequestOptions = {}): Promise<SafeRequestResult> {
  const port = server ? server.port : undefined;
  const defaultPorts = new Set([80, 443, ...(port ? [port] : [])]);
  return rawSafeRequest(url, {
    ...opts,
    allowedPorts: opts.allowedPorts ?? defaultPorts,
  });
}

let server: TestServer | undefined;

function setDns(hostname: string, ips: string[]) {
  dnsMap.set(hostname, ips);
}

beforeEach(() => {
  dnsMap.clear();
});

afterEach(async () => {
  if (server) {
    await server.close();
    server = undefined;
  }
  vi.useRealTimers();
});

describe('safeRequest — happy path', () => {
  it('completes a simple GET and reports latency', async () => {
    server = await startTestServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('hello');
    });
    setDns('good.test', ['127.0.0.1']);

    const result = await safeRequest(`http://good.test:${server.port}/`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe(200);
      expect(result.body.toString()).toBe('hello');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('resolves DNS exactly once per hop (not re-resolved by the HTTP client itself)', async () => {
    server = await startTestServer((_req, res) => {
      res.writeHead(200);
      res.end('ok');
    });
    setDns('single-resolve.test', ['127.0.0.1']);
    const spy = vi.fn(async () => ['127.0.0.1']);
    const dnsModule = await import('./dns.js');
    const original = dnsModule.dns.resolveAll;
    dnsModule.dns.resolveAll = spy;
    try {
      await safeRequest(`http://single-resolve.test:${server.port}/`);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      dnsModule.dns.resolveAll = original;
    }
  });
});

describe('safeRequest — redirect handling', () => {
  it('follows a redirect within the limit', async () => {
    server = await startTestServer((req, res) => {
      if (req.url === '/start') {
        res.writeHead(302, { Location: '/final' });
        res.end();
        return;
      }
      res.writeHead(200);
      res.end('final destination');
    });
    setDns('redirect.test', ['127.0.0.1']);

    const result = await safeRequest(`http://redirect.test:${server.port}/start`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.toString()).toBe('final destination');
      expect(result.redirectCount).toBe(1);
    }
  });

  it('rejects a redirect loop once it exceeds maxRedirects', async () => {
    server = await startTestServer((req, res) => {
      res.writeHead(302, { Location: req.url === '/a' ? '/b' : '/a' });
      res.end();
    });
    setDns('loop.test', ['127.0.0.1']);

    const result = await safeRequest(`http://loop.test:${server.port}/a`, { maxRedirects: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('TOO_MANY_REDIRECTS');
  });

  it('independently re-validates each redirect hop and blocks a redirect to a private IP', async () => {
    server = await startTestServer((_req, res) => {
      res.writeHead(302, { Location: 'http://internal.test/secret' });
      res.end();
    });
    setDns('public-hop.test', ['127.0.0.1']);
    setDns('internal.test', ['10.0.0.5']); // private — must be blocked on the second hop

    const result = await safeRequest(`http://public-hop.test:${server.port}/start`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('BLOCKED_IP');
  });

  it('does not follow a redirect to a cloud metadata address', async () => {
    server = await startTestServer((_req, res) => {
      res.writeHead(302, { Location: 'http://metadata.test/latest/meta-data/' });
      res.end();
    });
    setDns('public-hop2.test', ['127.0.0.1']);
    setDns('metadata.test', ['169.254.169.254']);

    const result = await safeRequest(`http://public-hop2.test:${server.port}/start`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('BLOCKED_IP');
  });
});

describe('safeRequest — response safety limits', () => {
  it('rejects a response body larger than maxResponseBytes', async () => {
    server = await startTestServer((_req, res) => {
      res.writeHead(200);
      res.end(Buffer.alloc(2000, 'x'));
    });
    setDns('big.test', ['127.0.0.1']);

    const result = await safeRequest(`http://big.test:${server.port}/`, { maxResponseBytes: 1000 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('RESPONSE_TOO_LARGE');
  });

  it('times out a slow response', async () => {
    server = await startTestServer((_req, res) => {
      // Never responds within the test's timeout window.
      setTimeout(() => {
        res.writeHead(200);
        res.end('too late');
      }, 5000);
    });
    setDns('slow.test', ['127.0.0.1']);

    const result = await safeRequest(`http://slow.test:${server.port}/`, { totalTimeoutMs: 200 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('TIMEOUT');
  }, 10_000);
});

describe('safeRequest — scheme, port, and URL-shape policy', () => {
  it('rejects disallowed schemes', async () => {
    const result = await safeRequest('ftp://example.test/file');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('DISALLOWED_SCHEME');
  });

  it('rejects file: scheme', async () => {
    const result = await safeRequest('file:///etc/passwd');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('DISALLOWED_SCHEME');
  });

  it('rejects data: scheme', async () => {
    const result = await safeRequest('data:text/plain;base64,aGVsbG8=');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('DISALLOWED_SCHEME');
  });

  it('rejects a disallowed port', async () => {
    setDns('oddport.test', ['127.0.0.1']);
    const result = await safeRequest('http://oddport.test:8080/');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('DISALLOWED_PORT');
  });

  it('rejects URLs with embedded userinfo', async () => {
    const result = await safeRequest('http://user:pass@example.test/');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('USERINFO_NOT_ALLOWED');
  });

  it('rejects a malformed URL', async () => {
    const result = await safeRequest('not a url at all');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('MALFORMED_URL');
  });

  it('rejects when DNS resolution fails', async () => {
    // no dns mapping configured for this hostname
    const result = await safeRequest('http://does-not-resolve.test/');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('DNS_FAILURE');
  });
});

describe('safeRequest — credential hygiene', () => {
  it('never sends an Authorization header even if a caller tries to pass one', async () => {
    let seenAuthHeader: string | undefined;
    server = await startTestServer((req, res) => {
      seenAuthHeader = req.headers.authorization;
      res.writeHead(200);
      res.end('ok');
    });
    setDns('nocreds.test', ['127.0.0.1']);

    await safeRequest(`http://nocreds.test:${server.port}/`, {
      headers: { Authorization: 'Bearer should-not-be-sent' },
    });
    expect(seenAuthHeader).toBeUndefined();
  });

  it('sends the honest AgentProof User-Agent', async () => {
    let seenUa: string | undefined;
    server = await startTestServer((req, res) => {
      seenUa = req.headers['user-agent'];
      res.writeHead(200);
      res.end('ok');
    });
    setDns('ua.test', ['127.0.0.1']);

    await safeRequest(`http://ua.test:${server.port}/`);
    expect(seenUa).toMatch(/^AgentProof\//);
  });
});
