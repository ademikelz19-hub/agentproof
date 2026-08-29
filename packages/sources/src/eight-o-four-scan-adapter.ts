/**
 * 8004scan adapter — STATUS: VERIFIED.
 *
 * Programmatic integration with the live 8004scan public API.
 */

import {
  BSC,
  parseExternal,
  rawAgentMetadataSchema,
} from '@agentproof/core';
import type {
  AgentIdentity,
  AgentMetadata,
  AgentService,
  ChainAgentIndexer,
  Ingested,
} from '@agentproof/core';
import { normalizeAgentServices } from './normalize';
import { z } from 'zod';

export const EIGHT_O_FOUR_SCAN_BASE_URL = 'https://8004scan.io/api/v1/public';

const publicAgentListItemSchema = z.object({
  token_id: z.string(),
  chain_id: z.number(),
  contract_address: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

const publicAgentsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(publicAgentListItemSchema),
});

const publicAgentDetailResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    token_id: z.string(),
    chain_id: z.number(),
    contract_address: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    raw_metadata: z.object({
      offchain_uri: z.string().optional().nullable(),
      offchain_content: rawAgentMetadataSchema.optional().nullable(),
    }).optional().nullable(),
  }),
});

export class EightOFourScanAdapter implements ChainAgentIndexer {
  readonly chain = BSC.id;
  readonly sourceLabel = '8004scan';

  private getHeaders(): Record<string, string> {
    const key = process.env.EIGHT004SCAN_API_KEY;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'AgentProof/0.1.0 (observational reliability monitor)',
    };
    if (key) {
      headers['X-API-Key'] = key;
    }
    return headers;
  }

  async listAgents(opts?: { limit?: number; cursor?: string }): Promise<Ingested<AgentIdentity[]>> {
    try {
      const url = new URL(`${EIGHT_O_FOUR_SCAN_BASE_URL}/agents`);
      if (opts?.limit) url.searchParams.append('limit', String(opts.limit));
      if (opts?.cursor) url.searchParams.append('page', opts.cursor);

      const response = await fetch(url.toString(), {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return {
          ok: false,
          reason: 'UPSTREAM_INDEXER_FAILURE',
          detail: `8004scan responded with HTTP ${response.status}`,
        };
      }

      const rawJson = await response.json();
      const parsed = parseExternal(publicAgentsResponseSchema, rawJson);

      if (!parsed.ok) {
        return {
          ok: false,
          reason: 'UPSTREAM_INDEXER_FAILURE',
          detail: `Failed to validate agents response schema: ${parsed.error}`,
        };
      }

      const agents = parsed.data.data
        .filter((item) => item.chain_id === 56) // BSC only
        .map((item) => ({
          id: `bsc:${item.token_id}`,
          chain: BSC.id,
          onchainId: item.token_id,
          registryAddress: item.contract_address,
          provenance: {
            source: 'INDEXER' as const,
            origin: this.sourceLabel,
            observedAt: new Date().toISOString(),
          },
        }));

      return { ok: true, data: agents };
    } catch (error) {
      return {
        ok: false,
        reason: 'UPSTREAM_INDEXER_FAILURE',
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getAgentMetadata(agentId: string): Promise<Ingested<AgentMetadata>> {
    try {
      const tokenId = agentId.split(':')[1];
      if (!tokenId) {
        return {
          ok: false,
          reason: 'AGENTPROOF_INTERNAL_ERROR',
          detail: `Invalid agent ID format: ${agentId}`,
        };
      }

      const response = await fetch(`${EIGHT_O_FOUR_SCAN_BASE_URL}/agents/56/${tokenId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return {
          ok: false,
          reason: 'UPSTREAM_INDEXER_FAILURE',
          detail: `8004scan details responded with HTTP ${response.status}`,
        };
      }

      const rawJson = await response.json();
      const parsed = parseExternal(publicAgentDetailResponseSchema, rawJson);

      if (!parsed.ok) {
        return {
          ok: false,
          reason: 'UPSTREAM_INDEXER_FAILURE',
          detail: `Failed to validate agent details schema: ${parsed.error}`,
        };
      }

      const agentData = parsed.data.data;
      const metadataUri = agentData.raw_metadata?.offchain_uri ?? undefined;
      const metadataResolved = !!agentData.raw_metadata?.offchain_content;

      return {
        ok: true,
        data: {
          agentId,
          name: agentData.name,
          ...(agentData.description ? { description: agentData.description } : {}),
          ...(metadataUri ? { metadataUri } : {}),
          metadataResolved,
          provenance: {
            source: 'INDEXER' as const,
            origin: this.sourceLabel,
            observedAt: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'UPSTREAM_INDEXER_FAILURE',
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getAgentServices(agentId: string): Promise<Ingested<AgentService[]>> {
    try {
      const tokenId = agentId.split(':')[1];
      if (!tokenId) {
        return {
          ok: false,
          reason: 'AGENTPROOF_INTERNAL_ERROR',
          detail: `Invalid agent ID format: ${agentId}`,
        };
      }

      const response = await fetch(`${EIGHT_O_FOUR_SCAN_BASE_URL}/agents/56/${tokenId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return {
          ok: false,
          reason: 'UPSTREAM_INDEXER_FAILURE',
          detail: `8004scan details responded with HTTP ${response.status}`,
        };
      }

      const rawJson = await response.json();
      const parsed = parseExternal(publicAgentDetailResponseSchema, rawJson);

      if (!parsed.ok) {
        return {
          ok: false,
          reason: 'UPSTREAM_INDEXER_FAILURE',
          detail: `Failed to validate agent details schema: ${parsed.error}`,
        };
      }

      const agentData = parsed.data.data;
      const offchainContent = agentData.raw_metadata?.offchain_content;

      if (!offchainContent) {
        return { ok: true, data: [] };
      }

      const services = normalizeAgentServices(
        agentId,
        BSC.id,
        offchainContent,
        {
          source: 'ERC8004_METADATA' as const,
          origin: this.sourceLabel,
          observedAt: new Date().toISOString(),
        }
      );

      return { ok: true, data: services };
    } catch (error) {
      return {
        ok: false,
        reason: 'UPSTREAM_INDEXER_FAILURE',
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
