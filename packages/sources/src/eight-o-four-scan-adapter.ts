/**
 * 8004scan adapter — STATUS: BLOCKED_LIVE_NETWORK / UNVERIFIED.
 *
 * This sandbox cannot reach `8004scan` (or any candidate domain for it) —
 * see docs/ENVIRONMENT_BASELINE.md for the exact confirmed failure. That
 * means:
 *
 *   - The real base URL is not confirmed here (the string below is a
 *     placeholder / best guess, not a verified endpoint).
 *   - The real response shape has NOT been observed. `rawAgentMetadataSchema`
 *     in @agentproof/core is written from the ERC-8004 metadata convention
 *     described in the build prompt, not from an actual captured response.
 *   - This adapter has never successfully executed against a live server.
 *
 * DO NOT treat this file as a working integration. It exists so that once
 * real network access is available (owner's laptop), there is a structurally
 * correct adapter to plug real response samples into and verify — not a
 * blank page. Every method that would need a live network call currently
 * returns an `IngestionFailure` with reason `BLOCKED_LIVE_NETWORK`.
 *
 * Never wire this adapter into any UI/database as if it produces real
 * data. It is intentionally inert until explicitly re-verified.
 */

import type {
  AgentIdentity,
  AgentMetadata,
  AgentService,
  ChainAgentIndexer,
  Ingested,
} from '@agentproof/core';
import { BSC } from '@agentproof/core';

/** UNVERIFIED — placeholder only, not a confirmed live endpoint. */
export const UNVERIFIED_EIGHT_O_FOUR_SCAN_BASE_URL = 'https://8004scan.io/api/v1';

export class EightOFourScanAdapter implements ChainAgentIndexer {
  readonly chain = BSC.id;
  readonly sourceLabel = '8004scan';

  async listAgents(): Promise<Ingested<AgentIdentity[]>> {
    return {
      ok: false,
      reason: 'BLOCKED_LIVE_NETWORK',
      detail:
        '8004scan is unreachable from this sandbox (confirmed HTTP 403 host_not_allowed from the egress proxy). ' +
        'This adapter has not been exercised against a live response and its base URL/response shape are unverified.',
    };
  }

  async getAgentMetadata(_agentId: string): Promise<Ingested<AgentMetadata>> {
    return {
      ok: false,
      reason: 'BLOCKED_LIVE_NETWORK',
      detail: '8004scan is unreachable from this sandbox — see listAgents() for detail.',
    };
  }

  async getAgentServices(_agentId: string): Promise<Ingested<AgentService[]>> {
    return {
      ok: false,
      reason: 'BLOCKED_LIVE_NETWORK',
      detail: '8004scan is unreachable from this sandbox — see listAgents() for detail.',
    };
  }
}
