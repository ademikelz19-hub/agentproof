import { z } from 'zod';
import { SUPPORTED_CHAINS, type ChainId } from '@agentproof/core';

const chainIds = SUPPORTED_CHAINS.map((c) => c.id) as [ChainId, ...ChainId[]];

export const agentParamsSchema = z.object({
  chain: z.enum(chainIds),
  id: z.string().min(1).max(200),
});

export function normalizeChain(rawChain?: string | null): ChainId | null {
  if (!rawChain) return null;
  const lower = rawChain.trim().toLowerCase();
  if (
    lower === 'bsc' ||
    lower === '56' ||
    lower === 'bnb' ||
    lower === 'bscmainnet' ||
    lower === 'bsc-mainnet' ||
    lower === 'binance' ||
    lower === 'binancesmartchain'
  ) {
    return 'bsc';
  }
  return null;
}

export function parseAgentParams(params: { chain: string; id: string }):
  | { ok: true; value: { chain: ChainId; id: string } }
  | { ok: false; error: string } {
  let normalizedParams = params;
  try {
    const normalizedChain = normalizeChain(params.chain) ?? params.chain;
    normalizedParams = {
      chain: normalizedChain,
      id: decodeURIComponent(params.id),
    };
  } catch {}

  const result = agentParamsSchema.safeParse(normalizedParams);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((i) => i.message).join('; ') };
  }
  return { ok: true, value: result.data };
}
