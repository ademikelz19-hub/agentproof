/**
 * scripts/ingest-feedbacks.ts
 *
 * Fetches feedback records from 8004scan's /feedbacks?chainId=56 endpoint,
 * maps them to FeedbackRecord[], runs computeReputationEvidence per agent,
 * and persists the resulting reputation snapshots + integrity signals to Neon.
 *
 * Run with:
 *   npx tsx scripts/ingest-feedbacks.ts
 *
 * Provenance is always explicit: every record carries source='8004scan' and
 * origin= the request URL so it remains auditable.
 */

import { db } from '@agentproof/db';
import { computeReputationEvidence } from '@agentproof/reputation';
import {
  type FeedbackRecord,
  type FeedbackQueryResult,
  type Provenance,
} from '@agentproof/core';
import { DrizzleReputationRepository } from '@agentproof/db';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.EIGHT004SCAN_API_KEY ?? process.env.EIGHT_O_FOUR_API_KEY;
if (!API_KEY) {
  throw new Error('EIGHT004SCAN_API_KEY or EIGHT_O_FOUR_API_KEY is not set in environment or .env.local');
}
const CHAIN_ID = 56;
const FEEDBACKS_URL = `https://8004scan.io/api/v1/public/feedbacks?chainId=${CHAIN_ID}&limit=100`;
const PROVENANCE_ORIGIN = FEEDBACKS_URL;

interface RawFeedback {
  agent_id: string;       // UUID
  user_address: string;
  submitted_at: string;   // ISO 8601
  feedback_uri?: string;  // data:application/json;base64,<...>
  tag1?: string;
  tag2?: string;
  chain_id?: number;
  id?: string;
}

interface ParsedFeedbackUri {
  agentId?: number;        // numeric token_id on chain
}

/** Decode the base64 data-URI to get the numeric agentId (token_id). */
function decodeAgentTokenId(feedbackUri: string | undefined): number | null {
  if (!feedbackUri?.startsWith('data:application/json;base64,')) return null;
  try {
    const b64 = feedbackUri.slice('data:application/json;base64,'.length);
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const parsed: ParsedFeedbackUri = JSON.parse(json);
    return typeof parsed.agentId === 'number' ? parsed.agentId : null;
  } catch {
    return null;
  }
}

/** Fetch all feedback pages from 8004scan until exhausted. */
async function fetchAllFeedbacks(): Promise<RawFeedback[]> {
  const all: RawFeedback[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `https://8004scan.io/api/v1/public/feedbacks?chainId=${CHAIN_ID}&limit=100&page=${page}`;
    const res = await fetch(url, { headers: { 'X-API-Key': API_KEY } });
    if (!res.ok) {
      console.warn(`  [Warn] /feedbacks page ${page} returned HTTP ${res.status}. Stopping pagination.`);
      break;
    }
    const body = await res.json() as {
      success: boolean;
      data: RawFeedback[];
      meta?: { pagination?: { hasMore: boolean } };
    };
    if (!body.success || !Array.isArray(body.data)) break;
    all.push(...body.data);
    hasMore = body.meta?.pagination?.hasMore ?? false;
    page++;
    // Rate-limit: pause briefly between pages
    if (hasMore) await new Promise(r => setTimeout(r, 300));
  }

  return all;
}

async function run() {
  console.log('--- AgentProof: Feedback Ingestion Run ---');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set. Run from monorepo root with .env.local present.');
  }

  // 1. Fetch all feedbacks from 8004scan
  console.log(`Fetching feedbacks from ${FEEDBACKS_URL}...`);
  const rawFeedbacks = await fetchAllFeedbacks();
  console.log(`Fetched ${rawFeedbacks.length} raw feedback records.`);

  // 2. Map raw records → FeedbackRecord[], grouped by agentProof id ("bsc:<tokenId>")
  const provenance: Provenance = {
    source: 'INDEXER',
    origin: PROVENANCE_ORIGIN,
    observedAt: new Date().toISOString(),
  };

  // Group by agentProof id: bsc:<tokenId>
  const byAgent = new Map<string, FeedbackRecord[]>();

  for (const raw of rawFeedbacks) {
    const tokenId = decodeAgentTokenId(raw.feedback_uri);
    if (tokenId === null) {
      // Skip records where we cannot determine the agent token_id
      continue;
    }
    const agentProofId = `bsc:${tokenId}`;
    if (!byAgent.has(agentProofId)) byAgent.set(agentProofId, []);

    byAgent.get(agentProofId)!.push({
      agentId: agentProofId,
      reviewerId: raw.user_address ?? 'unknown',
      timestamp: raw.submitted_at ?? new Date().toISOString(),
      provenance,
    });
  }

  console.log(`Mapped feedback to ${byAgent.size} distinct agents.`);

  // 3. For each agent, compute reputation evidence and persist
  const reputationRepo = new DrizzleReputationRepository(db);
  let successCount = 0;
  let errorCount = 0;

  for (const [agentId, records] of byAgent) {
    try {
      const feedbackResult: FeedbackQueryResult = {
        status: 'AVAILABLE',
        records,
      };

      const evidence = computeReputationEvidence({
        agentId,
        feedback: feedbackResult,
        now: new Date(),
      });

      // Persist the snapshot
      await reputationRepo.recordReputationEvidence(evidence);

      // Persist any integrity signals
      if ('integritySignals' in evidence && Array.isArray(evidence.integritySignals)) {
        await reputationRepo.recordIntegritySignals(evidence.integritySignals);
      }

      console.log(
        `  [OK] ${agentId}: feedbackCount=${records.length}, ` +
        `uniqueReviewers=${'uniqueReviewerCount' in evidence ? evidence.uniqueReviewerCount : '?'}, ` +
        `sufficiency=${'feedbackAvailability' in evidence && evidence.feedbackAvailability === 'AVAILABLE' && 'evidenceSufficiency' in evidence ? (evidence as { evidenceSufficiency: string }).evidenceSufficiency : 'INSUFFICIENT'}`
      );
      successCount++;
    } catch (err: unknown) {
      console.error(`  [Error] ${agentId}:`, err instanceof Error ? err.message : String(err));
      errorCount++;
    }
  }

  console.log(`\n--- Ingestion Complete ---`);
  console.log(`  Agents processed: ${successCount + errorCount}`);
  console.log(`  Successful:       ${successCount}`);
  console.log(`  Errors:           ${errorCount}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
