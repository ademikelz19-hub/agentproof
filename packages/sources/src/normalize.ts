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

function inferProtocol(raw: { type?: string; protocol?: string; name?: string }): ServiceProtocol {
  const label = (raw.protocol ?? raw.type ?? raw.name ?? '').toUpperCase();
  if (label.includes('A2A')) return 'A2A';
  if (label.includes('MCP')) return 'MCP';
  if (label.includes('HTTP') || label.includes('WEB')) return 'HTTP';
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
    const out: AgentService[] = [];
    for (const svc of raw.services ?? []) {
      const url = svc.url ?? svc.endpoint;
      if (!url) continue;
      const rawId = svc.id ?? svc.name ?? randomUUID();
      out.push({
        id: `${agentId}:${rawId}`,
        agentId,
        chain,
        declarationForm: 'SERVICES' as const,
        protocol: inferProtocol({
          ...(svc.type ? { type: svc.type } : {}),
          ...(svc.protocol ? { protocol: svc.protocol } : {}),
          ...(svc.name ? { name: svc.name } : {}),
        }),
        url,
        provenance,
      });
    }
    return out;
  }

  const endpoints = raw.endpoints ?? [];
  const out: AgentService[] = [];
  for (const ep of endpoints) {
    const url = ep.url ?? ep.endpoint;
    if (!url) continue; // never invent a URL that wasn't actually declared
    const rawId = ep.id ?? ep.name ?? randomUUID();
    out.push({
      id: `${agentId}:${rawId}`,
      agentId,
      chain,
      declarationForm: 'ENDPOINTS' as const,
      protocol: inferProtocol({
        ...(ep.type ? { type: ep.type } : {}),
        ...(ep.name ? { name: ep.name } : {}),
      }),
      url,
      provenance,
    });
  }
  return out;
}
