import type { NextRequest } from 'next/server';
import { agentRepository } from '@/lib/api/repositories';
import { apiError, apiOk } from '@/lib/api/response';
import { parsePagination } from '@/lib/api/pagination';
import { normalizeChain } from '@/lib/api/agent-params';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pagination = parsePagination(searchParams);
  if (!pagination.ok) {
    return apiError('VALIDATION_ERROR', pagination.error);
  }

  const chainParam = searchParams.get('chain') ?? undefined;
  const normalizedChain = chainParam ? normalizeChain(chainParam) : undefined;
  if (chainParam && !normalizedChain) {
    return apiError('VALIDATION_ERROR', `Unsupported chain: ${chainParam}. Supported chains: bsc (56)`);
  }

  const page = await agentRepository.listAgents({
    ...(normalizedChain ? { chain: normalizedChain } : {}),
    limit: pagination.value.limit,
    ...(pagination.value.cursor ? { cursor: pagination.value.cursor } : {}),
  });

  return apiOk(page, { cacheSeconds: 30 });
}
