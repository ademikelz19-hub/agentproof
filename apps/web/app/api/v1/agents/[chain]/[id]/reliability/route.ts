import { agentRepository, observationRepository } from '@/lib/api/repositories';
import { apiError, apiOk } from '@/lib/api/response';
import { parseAgentParams } from '@/lib/api/agent-params';
import { computeReliabilityWindow } from '@agentproof/reliability';
import type { ReliabilityWindowSize } from '@agentproof/core';

const WINDOWS: ReliabilityWindowSize[] = ['24h', '7d', '30d'];
/** How far back we fetch to feed even the widest (30d) window's calculation. */
const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

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

  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_MS).toISOString();

  // Pull every observation in the lookback window once (bounded page size
  // is fine here — 30 days at a conservative probe cadence is a modest
  // row count; see docs/COST_MODEL.md), then compute all three windows
  // from the same in-memory set rather than querying three times.
  const page = await observationRepository.listObservations({
    agentId: agent.id,
    since,
    until: now.toISOString(),
    limit: 5000,
  });

  const windows = Object.fromEntries(
    WINDOWS.map((window) => [
      window,
      computeReliabilityWindow({ agentId: agent.id, window, observations: page.items, now }),
    ]),
  );

  return apiOk({ windows }, { cacheSeconds: 30 });
}
