import { agentRepository, reputationRepository } from '@/lib/api/repositories';
import { apiError, apiOk } from '@/lib/api/response';
import { parseAgentParams } from '@/lib/api/agent-params';
import { computeReputationEvidence } from '@agentproof/reputation';

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

  const feedback = await reputationRepository.listFeedback(agent.id);
  const evidence = computeReputationEvidence({ agentId: agent.id, feedback, now: new Date() });

  return apiOk(evidence, { cacheSeconds: 60 });
}
