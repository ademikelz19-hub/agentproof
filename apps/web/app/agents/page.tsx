import { PageShell } from '@/components/PageShell';
import { AgentExplorerTable } from '@/components/AgentExplorerTable';
import { db, agents, services } from '@agentproof/db';
import { desc, eq } from 'drizzle-orm';
import { Activity, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  // Fetch agents and their associated services directly from Neon
  let agentItems: any[] = [];

  try {
    const rawAgents = await db.select().from(agents).orderBy(desc(agents.lastIngestedAt)).limit(100);
    const rawServices = await db.select().from(services);

    // Group services by agentId
    const servicesByAgent = new Map<string, typeof rawServices>();
    for (const svc of rawServices) {
      if (!servicesByAgent.has(svc.agentId)) servicesByAgent.set(svc.agentId, []);
      servicesByAgent.get(svc.agentId)!.push(svc);
    }

    agentItems = rawAgents.map((a) => ({
      id: a.id,
      chain: a.chain,
      onchainId: a.onchainId,
      registryAddress: a.registryAddress,
      name: a.name,
      description: a.description,
      metadataResolved: a.metadataResolved,
      services: servicesByAgent.get(a.id) ?? [],
      provenance: {
        source: a.provenanceSource,
        origin: a.provenanceOrigin,
        observedAt: a.lastIngestedAt ? new Date(a.lastIngestedAt).toISOString() : new Date().toISOString(),
      },
    }));
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
          <span>LIVE EXPLORER • BNB CHAIN (56)</span>
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
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: 680, lineHeight: 1.6 }}>
          Every agent listed here reflects real, independently measured evidence — reachability,
          latency, and evidence sufficiency. No listing is ever synthesized from placeholder or mock data.
        </p>
      </div>

      {/* Explorer Table Component */}
      <AgentExplorerTable agents={agentItems} />
    </PageShell>
  );
}
