import { PageShell, EmptyState } from '@/components/PageShell';
import { agentRepository } from '@/lib/api/repositories';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const page = await agentRepository.listAgents({ limit: 25 });

  return (
    <PageShell>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>Agents</h1>
      <p style={{ color: '#666', marginTop: 0, marginBottom: '2rem' }}>
        Every listing here reflects real, independently measured evidence — reachability,
        latency, and evidence coverage. No agent is ever shown from synthetic or fabricated data.
      </p>

      {page.items.length === 0 ? (
        <EmptyState
          title="No monitored agents yet"
          body="AgentProof has not ingested any ERC-8004 agents in this environment yet — see the Methodology page for what's measured and how, and the developer docs for the API once monitoring is activated."
        />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e5e5' }}>
              <th style={{ padding: '0.5rem 0' }}>Agent</th>
              <th>Chain</th>
              <th>Last observed</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((agent) => (
              <tr key={agent.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '0.6rem 0' }}>
                  <a href={`/agents/${agent.chain}/${agent.id}`}>{agent.id}</a>
                </td>
                <td>{agent.chain}</td>
                <td>{agent.provenance.observedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
