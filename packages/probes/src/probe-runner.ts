/**
 * Probe framework.
 *
 * Deterministic, modular: each probe type is a pure function of
 * (ProbeTarget) -> Promise<ProbeObservation>, built on top of `safeRequest`
 * (never the raw HTTP client). Every probe is read-only, non-destructive,
 * and incapable of signing or spending anything — there is no wallet/key
 * material anywhere in this package.
 *
 * Deliberately keeps HTTP-status observation separate from protocol
 * validation: "HTTP 200" and "the agent's protocol response is valid" are
 * different claims (build prompt section 7) and must never be collapsed
 * into one.
 */

import { randomUUID } from 'node:crypto';
import {
  METHODOLOGY_VERSIONS,
  type ProbeObservation,
  type ProbeOutcome,
  type ProbeTarget,
  type ProbeType,
  type Provenance,
} from '@agentproof/core';
import { safeRequest, type SafeRequestResult } from './transport';

export const PROBE_VERSION = '0.1.0';

function provenance(origin: string): Provenance {
  return { source: 'AGENTPROOF_MEASUREMENT', origin, observedAt: new Date().toISOString() };
}

function baseObservation(
  target: ProbeTarget,
  probeType: ProbeType,
  outcome: ProbeOutcome,
  extra: Partial<ProbeObservation> = {},
): ProbeObservation {
  return {
    id: randomUUID(),
    agentId: target.agentId,
    chain: target.chain,
    serviceId: target.serviceId,
    probeType,
    timestamp: new Date().toISOString(),
    outcome,
    provenance: provenance(`agentproof-probe:${probeType}`),
    probeVersion: PROBE_VERSION,
    methodologyVersion: METHODOLOGY_VERSIONS.probe,
    ...extra,
  };
}

/** Map a transport-level failure onto AgentProof's shared outcome vocabulary. Keeps "we couldn't reach it" distinct from "our own tooling broke" (section 29). */
function outcomeFromTransportFailure(result: Extract<SafeRequestResult, { ok: false }>): ProbeOutcome {
  switch (result.reason) {
    case 'DNS_FAILURE':
      return 'DNS_FAILURE';
    case 'TIMEOUT':
      return 'TIMEOUT';
    case 'BLOCKED_IP':
    case 'DISALLOWED_SCHEME':
    case 'DISALLOWED_PORT':
    case 'USERINFO_NOT_ALLOWED':
    case 'MALFORMED_URL':
      return 'BLOCKED_BY_SECURITY_POLICY';
    case 'TOO_MANY_REDIRECTS':
    case 'RESPONSE_TOO_LARGE':
    case 'CONNECTION_ERROR':
    default:
      return 'AGENT_UNREACHABLE';
  }
}

/**
 * SERVICE_REACHABILITY: can AgentProof establish a connection and get any
 * HTTP response at all? Does not judge the response's content.
 */
export async function probeServiceReachability(target: ProbeTarget): Promise<ProbeObservation> {
  const result = await safeRequest(target.url, { method: 'GET' });
  if (!result.ok) {
    return baseObservation(target, 'SERVICE_REACHABILITY', outcomeFromTransportFailure(result), {
      failureReason: result.detail,
    });
  }
  return baseObservation(target, 'SERVICE_REACHABILITY', 'SUCCESS', {
    latencyMs: result.latencyMs,
    httpStatus: result.status,
  });
}

/**
 * HTTP_STATUS: records the raw HTTP status code as its own piece of
 * evidence — separate from reachability and from protocol validity.
 */
export async function probeHttpStatus(target: ProbeTarget): Promise<ProbeObservation> {
  const result = await safeRequest(target.url, { method: 'GET' });
  if (!result.ok) {
    return baseObservation(target, 'HTTP_STATUS', outcomeFromTransportFailure(result), {
      failureReason: result.detail,
    });
  }
  // A well-formed HTTP response (even 4xx/5xx) is still a successful
  // *observation* — AgentProof successfully observed the status code. What
  // that status code means for reliability is a downstream calculation,
  // not this probe's job.
  return baseObservation(target, 'HTTP_STATUS', 'SUCCESS', {
    httpStatus: result.status,
    latencyMs: result.latencyMs,
  });
}

/**
 * RESPONSE_LATENCY: records how long a successful response took. Only
 * meaningful paired with a SUCCESS outcome.
 */
export async function probeResponseLatency(target: ProbeTarget): Promise<ProbeObservation> {
  const result = await safeRequest(target.url, { method: 'GET' });
  if (!result.ok) {
    return baseObservation(target, 'RESPONSE_LATENCY', outcomeFromTransportFailure(result), {
      failureReason: result.detail,
    });
  }
  return baseObservation(target, 'RESPONSE_LATENCY', 'SUCCESS', {
    latencyMs: result.latencyMs,
    httpStatus: result.status,
  });
}

/**
 * METADATA_RESOLUTION: can AgentProof fetch + parse the agent's declared
 * metadata document? Validity of the parse happens through the runtime
 * validation boundary in @agentproof/core, not here — this probe only
 * proves fetchability of a metadata URI supplied by the caller.
 */
export async function probeMetadataResolution(
  target: ProbeTarget,
  metadataUri: string,
): Promise<ProbeObservation> {
  const result = await safeRequest(metadataUri, { method: 'GET' });
  if (!result.ok) {
    return baseObservation(target, 'METADATA_RESOLUTION', outcomeFromTransportFailure(result), {
      failureReason: result.detail,
    });
  }
  if (result.status >= 400) {
    return baseObservation(target, 'METADATA_RESOLUTION', 'AGENT_UNREACHABLE', {
      httpStatus: result.status,
      latencyMs: result.latencyMs,
      failureReason: `metadata URI returned HTTP ${result.status}`,
    });
  }
  return baseObservation(target, 'METADATA_RESOLUTION', 'SUCCESS', {
    httpStatus: result.status,
    latencyMs: result.latencyMs,
  });
}

/**
 * PROTOCOL_RESPONSE_VALIDITY: only implemented where the protocol can be
 * confidently validated. For unknown/unsupported protocols this returns
 * PROTOCOL_INVALID rather than guessing — never upgrades a bare HTTP 200
 * into "the agent works correctly" (section 7).
 */
export async function probeProtocolResponseValidity(target: ProbeTarget): Promise<ProbeObservation> {
  if (target.protocol !== 'HTTP') {
    // A2A / MCP validators are not yet implemented in V0 — record this
    // honestly instead of silently skipping or faking success.
    return baseObservation(target, 'PROTOCOL_RESPONSE_VALIDITY', 'PROTOCOL_INVALID', {
      failureReason: `no validator implemented yet for protocol ${target.protocol}`,
    });
  }
  const result = await safeRequest(target.url, { method: 'GET' });
  if (!result.ok) {
    return baseObservation(target, 'PROTOCOL_RESPONSE_VALIDITY', outcomeFromTransportFailure(result), {
      failureReason: result.detail,
    });
  }
  // Minimal, honest HTTP-protocol validity check: a well-formed HTTP
  // response was received. This deliberately does NOT claim anything about
  // application-level correctness.
  const valid = result.status < 500;
  return baseObservation(
    target,
    'PROTOCOL_RESPONSE_VALIDITY',
    valid ? 'SUCCESS' : 'PROTOCOL_INVALID',
    { httpStatus: result.status, latencyMs: result.latencyMs },
  );
}

export const PROBE_RUNNERS: Record<Exclude<ProbeType, 'METADATA_RESOLUTION'>, (t: ProbeTarget) => Promise<ProbeObservation>> = {
  SERVICE_REACHABILITY: probeServiceReachability,
  HTTP_STATUS: probeHttpStatus,
  RESPONSE_LATENCY: probeResponseLatency,
  PROTOCOL_RESPONSE_VALIDITY: probeProtocolResponseValidity,
};
