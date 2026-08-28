import type { NextRequest } from 'next/server';
import { agentRepository } from '@/lib/api/repositories';
import { apiError, apiOk } from '@/lib/api/response';
import { parsePagination } from '@/lib/api/pagination';
import { SUPPORTED_CHAINS } from '@agentproof/core';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pagination = parsePagination(searchParams);
  if (!pagination.ok) {
    return apiError('VALIDATION_ERROR', pagination.error);
  }

  const chainParam = searchParams.get('chain') ?? undefined;
  if (chainParam && !SUPPORTED_CHAINS.some((c) => c.id === chainParam)) {
    return apiError('VALIDATION_ERROR', `Unsupported chain: ${chainParam}`);
  }

  const page = await agentRepository.listAgents({
    ...(chainParam ? { chain: chainParam as 'bsc' } : {}),
    limit: pagination.value.limit,
    ...(pagination.value.cursor ? { cursor: pagination.value.cursor } : {}),
  });

  return apiOk(page, { cacheSeconds: 30 });
}
