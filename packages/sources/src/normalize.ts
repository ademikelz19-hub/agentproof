/**
 * Normalizes already-validated raw ERC-8004-style metadata (see
 * `@agentproof/core`'s `rawAgentMetadataSchema`) into AgentProof's own
 * `AgentService[]` domain type.
 *
 * ERC-8004 metadata may declare services via the current "services" key or
 * the legacy "endpoints" key, or both. Per the build prompt: prefer
 * "services" when both exist, and never silently invent a protocol/url
 * AgentProof didn't actually see.
 */

import { randomUUID } from 'node:crypto';
import type { AgentService, ChainId, Provenance, RawAgentMetadata, ServiceProtocol } from '@agentproof/core';

function inferProtocol(raw: { type?: string | undefined; protocol?: string | undefined }): ServiceProtocol {
  const label = (raw.protocol ?? raw.type ?? '').toUpperCase();
  if (label.includes('A2A')) return 'A2A';
  if (label.includes('MCP')) return 'MCP';
  if (label.includes('HTTP')) return 'HTTP';
  return 'UNKNOWN';
}

export function normalizeAgentServices(
  agentId: string,
  chain: ChainId,
  raw: RawAgentMetadata,
  provenance: Provenance,
): AgentService[] {
  const hasServices = Array.isArray(raw.services) && raw.services.length > 0;

  if (hasServices) {
    return (raw.services ?? []).map((svc) => ({
      id: svc.id ?? randomUUID(),
      agentId,
      chain,
      declarationForm: 'SERVICES' as const,
      protocol: inferProtocol(svc),
      url: svc.url,
      provenance,
    }));
  }

  const endpoints = raw.endpoints ?? [];
  const out: AgentService[] = [];
  for (const ep of endpoints) {
    const url = ep.url ?? ep.endpoint;
    if (!url) continue; // never invent a URL that wasn't actually declared
    out.push({
      id: ep.id ?? randomUUID(),
      agentId,
      chain,
      declarationForm: 'ENDPOINTS' as const,
      protocol: inferProtocol(ep),
      url,
      provenance,
    });
  }
  return out;
}
