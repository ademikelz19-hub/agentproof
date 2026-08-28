import { describe, expect, it, vi } from 'vitest';
import type { ProbeTarget } from '@agentproof/core';
import type { SafeRequestResult } from './transport';

vi.mock('./transport.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./transport.js')>();
  return { ...actual, safeRequest: vi.fn() };
});

const { safeRequest } = await import('./transport.js');
const {
  probeServiceReachability,
  probeHttpStatus,
  probeResponseLatency,
  probeMetadataResolution,
  probeProtocolResponseValidity,
} = await import('./probe-runner.js');

const mockedSafeRequest = safeRequest as unknown as ReturnType<typeof vi.fn>;

const target: ProbeTarget = {
  agentId: 'bsc:1',
  chain: 'bsc',
  serviceId: 'svc-1',
  url: 'https://agent.example.test/api',
  protocol: 'HTTP',
};

function ok(overrides: Partial<Extract<SafeRequestResult, { ok: true }>> = {}): SafeRequestResult {
  return {
    ok: true,
    status: 200,
    headers: {},
    body: Buffer.from(''),
    finalUrl: target.url,
    redirectCount: 0,
    latencyMs: 42,
    ...overrides,
  };
}

function failure(
  reason: Extract<SafeRequestResult, { ok: false }>['reason'],
  detail = 'test failure',
): SafeRequestResult {
  return { ok: false, reason, detail, latencyMs: 5 };
}

describe('probeServiceReachability', () => {
  it('records SUCCESS with latency and status on a clean response', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 200, latencyMs: 88 }));
    const obs = await probeServiceReachability(target);
    expect(obs.outcome).toBe('SUCCESS');
    expect(obs.httpStatus).toBe(200);
    expect(obs.latencyMs).toBe(88);
    expect(obs.probeType).toBe('SERVICE_REACHABILITY');
    expect(obs.methodologyVersion).toBeTruthy();
  });

  it('maps a DNS failure to DNS_FAILURE, not a generic error', async () => {
    mockedSafeRequest.mockResolvedValueOnce(failure('DNS_FAILURE'));
    const obs = await probeServiceReachability(target);
    expect(obs.outcome).toBe('DNS_FAILURE');
  });

  it('maps an SSRF policy block to BLOCKED_BY_SECURITY_POLICY, distinct from AGENT_UNREACHABLE', async () => {
    mockedSafeRequest.mockResolvedValueOnce(failure('BLOCKED_IP'));
    const obs = await probeServiceReachability(target);
    expect(obs.outcome).toBe('BLOCKED_BY_SECURITY_POLICY');
  });

  it('maps a timeout to TIMEOUT', async () => {
    mockedSafeRequest.mockResolvedValueOnce(failure('TIMEOUT'));
    const obs = await probeServiceReachability(target);
    expect(obs.outcome).toBe('TIMEOUT');
  });
});

describe('probeHttpStatus', () => {
  it('treats a well-formed 500 response as a successful observation of that status code', async () => {
    // Important distinction: AgentProof successfully OBSERVED a 500 — that
    // is not the same as AgentProof failing to reach the agent.
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 500 }));
    const obs = await probeHttpStatus(target);
    expect(obs.outcome).toBe('SUCCESS');
    expect(obs.httpStatus).toBe(500);
  });
});

describe('probeResponseLatency', () => {
  it('only reports latency on success', async () => {
    mockedSafeRequest.mockResolvedValueOnce(failure('AGENT_UNREACHABLE' as never, 'connection refused'));
    const obs = await probeResponseLatency(target);
    expect(obs.outcome).toBe('AGENT_UNREACHABLE');
    expect(obs.latencyMs).toBeUndefined();
  });
});

describe('probeMetadataResolution', () => {
  it('treats a 404 on the metadata URI as unreachable, not as a resolved-but-empty document', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 404 }));
    const obs = await probeMetadataResolution(target, 'https://agent.example.test/metadata.json');
    expect(obs.outcome).toBe('AGENT_UNREACHABLE');
    expect(obs.httpStatus).toBe(404);
  });

  it('reports SUCCESS when the metadata URI is fetchable', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 200 }));
    const obs = await probeMetadataResolution(target, 'https://agent.example.test/metadata.json');
    expect(obs.outcome).toBe('SUCCESS');
  });
});

describe('probeProtocolResponseValidity', () => {
  it('never claims HTTP 200 means "protocol correct" for protocols without an implemented validator', async () => {
    const a2aTarget: ProbeTarget = { ...target, protocol: 'A2A' };
    const callsBefore = mockedSafeRequest.mock.calls.length;
    const obs = await probeProtocolResponseValidity(a2aTarget);
    expect(obs.outcome).toBe('PROTOCOL_INVALID');
    expect(mockedSafeRequest.mock.calls.length).toBe(callsBefore); // no request attempted at all
    expect(obs.failureReason).toMatch(/no validator implemented/);
  });

  it('validates a plain HTTP target and treats 5xx as PROTOCOL_INVALID', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 503 }));
    const obs = await probeProtocolResponseValidity(target);
    expect(obs.outcome).toBe('PROTOCOL_INVALID');
  });

  it('validates a plain HTTP target and treats 200 as SUCCESS', async () => {
    mockedSafeRequest.mockResolvedValueOnce(ok({ status: 200 }));
    const obs = await probeProtocolResponseValidity(target);
    expect(obs.outcome).toBe('SUCCESS');
  });
});
