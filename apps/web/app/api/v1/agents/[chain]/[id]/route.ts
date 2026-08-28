import { agentRepository } from '@/lib/api/repositories';
import { apiError, apiOk } from '@/lib/api/response';
import { parseAgentParams } from '@/lib/api/agent-params';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chain: string; id: string }> },
) {
  const parsed = parseAgentParams(await params);
  if (!parsed.ok) {
    return apiError('VALIDATION_ERROR', parsed.error);
  }

  const agent = await agentRepository.getAgent(parsed.value.chain, parsed.value.id);
  if (!agent) {
    return apiError('NOT_FOUND', `No agent ${parsed.value.id} on chain ${parsed.value.chain}`);
  }
  const metadata = await agentRepository.getMetadata(agent.id);

  return apiOk({ identity: agent, metadata }, { cacheSeconds: 30 });
}
