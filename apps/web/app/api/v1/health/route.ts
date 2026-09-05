import { NextResponse } from 'next/server';
import { db, probeRuns } from '@agentproof/db';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  let latestRunAt: string | null = null;
  let freshness: 'FRESH' | 'STALE' | 'UNKNOWN' = 'UNKNOWN';

  try {
    const [latestRun] = await db
      .select({
        id: probeRuns.id,
        finishedAt: probeRuns.finishedAt,
        startedAt: probeRuns.startedAt,
        targetAgentCount: probeRuns.targetAgentCount,
      })
      .from(probeRuns)
      .orderBy(desc(probeRuns.startedAt))
      .limit(1);

    if (latestRun) {
      const runTime = latestRun.finishedAt ?? latestRun.startedAt;
      latestRunAt = runTime.toISOString();
      const ageMs = Date.now() - runTime.getTime();
      // Fresh if run within last 3 hours (hourly schedule with jitter margin)
      freshness = ageMs <= 3 * 60 * 60 * 1000 ? 'FRESH' : 'STALE';
    }
  } catch (err) {
    freshness = 'UNKNOWN';
  }

  return NextResponse.json(
    {
      status: 'ok',
      service: 'agentproof',
      timestamp,
      version: '0.1.0',
      monitoring: {
        status: 'active',
        latestRunAt,
        freshness,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    },
  );
}
