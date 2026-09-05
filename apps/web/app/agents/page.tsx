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
    
    // Fetch observation count per agent to accurately identify active monitoring cohort
    const obsCounts = await db
      .select({
        agentId: observations.agentId,
        count: sql<number>`count(*)::int`,
      })
      .from(observations)
      .groupBy(observations.agentId);

    const obsCountMap = new Map<string, number>();
    for (const row of obsCounts) {
      obsCountMap.set(row.agentId, Number(row.count));
    }

    // Group services by agentId
    const servicesByAgent = new Map<string, typeof rawServices>();
    for (const svc of rawServices) {
      if (!servicesByAgent.has(svc.agentId)) servicesByAgent.set(svc.agentId, []);
      servicesByAgent.get(svc.agentId)!.push(svc);
    }

    agentItems = rawAgents.map((a) => {
      const obsCount = obsCountMap.get(a.id) ?? 0;
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
          Directory of ERC-8004 agents discovered from the BNB Chain registry. Agents with advertised endpoints
          are monitored via scheduled autonomous probe cycles.
        </p>
      </div>

      {/* Explorer Table Component */}
      <AgentExplorerTable agents={agentItems} />
    </PageShell>
  );
}
