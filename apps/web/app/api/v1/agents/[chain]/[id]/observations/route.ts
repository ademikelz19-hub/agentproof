import type { NextRequest } from 'next/server';
import { agentRepository, observationRepository } from '@/lib/api/repositories';
import { apiError, apiOk } from '@/lib/api/response';
import { parseAgentParams } from '@/lib/api/agent-params';
import { parsePagination } from '@/lib/api/pagination';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chain: string; id: string }> },
) {
  const parsed = parseAgentParams(await params);
  if (!parsed.ok) {
    return apiError('VALIDATION_ERROR', parsed.error);
  }

  const pagination = parsePagination(request.nextUrl.searchParams);
  if (!pagination.ok) {
    return apiError('VALIDATION_ERROR', pagination.error);
  }

  const agent = await agentRepository.getAgent(parsed.value.chain, parsed.value.id);
  if (!agent) {
    return apiError('NOT_FOUND', `No agent ${parsed.value.id} on chain ${parsed.value.chain}`);
  }

  const since = request.nextUrl.searchParams.get('since') ?? new Date(0).toISOString();
  const until = request.nextUrl.searchParams.get('until') ?? new Date().toISOString();
  const serviceId = request.nextUrl.searchParams.get('serviceId') ?? undefined;

  const page = await observationRepository.listObservations({
    agentId: agent.id,
    ...(serviceId ? { serviceId } : {}),
    since,
    until,
    limit: pagination.value.limit,
    ...(pagination.value.cursor ? { cursor: pagination.value.cursor } : {}),
  });

  return apiOk(page);
}
