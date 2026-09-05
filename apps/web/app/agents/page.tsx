import { PageShell } from '@/components/PageShell';
import { AgentExplorerTable, type AgentListItem } from '@/components/AgentExplorerTable';
import { db, agents, services, observations } from '@agentproof/db';
import { desc, sql } from 'drizzle-orm';
import { Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  let agentItems: AgentListItem[] = [];

  try {
    const rawAgents = await db.select().from(agents).orderBy(desc(agents.lastIngestedAt)).limit(500);
    const rawServices = await db.select().from(services);
    
    // Efficiently aggregate observation summaries per agent
    const obsStats = await db
      .select({
        agentId: observations.agentId,
        totalCount: sql<number>`count(*)::int`,
        successCount: sql<number>`count(*) FILTER (WHERE ${observations.outcome} = 'SUCCESS')::int`,
        latestOutcome: sql<string>`(array_agg(${observations.outcome} ORDER BY ${observations.timestamp} DESC))[1]`,
        latestLatency: sql<number>`(array_agg(${observations.latencyMs} FILTER (WHERE ${observations.latencyMs} IS NOT NULL) ORDER BY ${observations.timestamp} DESC))[1]`,
      })
      .from(observations)
      .groupBy(observations.agentId);

    const statsMap = new Map<
      string,
      { totalCount: number; successCount: number; latestOutcome?: string; latestLatency?: number }
    >();
    for (const row of obsStats) {
      statsMap.set(row.agentId, {
        totalCount: Number(row.totalCount),
        successCount: Number(row.successCount),
        latestOutcome: row.latestOutcome ?? undefined,
        latestLatency: row.latestLatency ? Number(row.latestLatency) : undefined,
      });
    }

    // Group services by agentId
    const servicesByAgent = new Map<string, typeof rawServices>();
    for (const svc of rawServices) {
      if (!servicesByAgent.has(svc.agentId)) servicesByAgent.set(svc.agentId, []);
      servicesByAgent.get(svc.agentId)!.push(svc);
    }

    agentItems = rawAgents.map((a) => {
      const stats = statsMap.get(a.id);
      const obsCount = stats?.totalCount ?? 0;
      const successCount = stats?.successCount ?? 0;
      const availPct = obsCount > 0 ? (successCount / obsCount) * 100 : null;

      return {
        id: a.id,
        chain: a.chain as any,
        onchainId: a.onchainId,
        registryAddress: a.registryAddress ?? undefined,
        name: a.name,
        description: a.description,
        metadataResolved: a.metadataResolved,
        services: (servicesByAgent.get(a.id) ?? []).map((s) => ({
          id: s.id,
          protocol: s.protocol,
          url: s.url,
        })),
        isMonitored: obsCount > 0,
        observationCount: obsCount,
        availabilityPct: availPct,
        latestOutcome: stats?.latestOutcome,
        latestLatencyMs: stats?.latestLatency,
        provenance: {
          source: a.provenanceSource as any,
          origin: a.provenanceOrigin,
          observedAt: a.lastIngestedAt ? new Date(a.lastIngestedAt).toISOString() : new Date().toISOString(),
        },
      };
    });
  } catch (err) {
    console.error('Error fetching agents list:', err);
  }

  return (
    <PageShell>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.2rem 0.65rem',
            background: 'var(--accent-bnb-subtle)',
            border: '1px solid var(--accent-bnb-border)',
            borderRadius: 4,
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-bnb)',
            marginBottom: '0.75rem',
          }}
        >
          <Activity size={12} />
          <span>DIRECTORY • BNB CHAIN (56)</span>
        </div>

        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '0.5rem',
            color: 'var(--text-primary)',
          }}
        >
          Autonomous Agents Directory
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: 720, lineHeight: 1.6 }}>
          Directory of ERC-8004 agents discovered from the BNB Chain registry. Quick reachability, uptime percentage, and response latency are shown directly for monitored agents.
        </p>
      </div>

      {/* Explorer Table Component */}
      <AgentExplorerTable agents={agentItems} />
    </PageShell>
  );
}
