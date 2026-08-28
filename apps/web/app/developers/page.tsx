import { PageShell } from '@/components/PageShell';

export default function DevelopersPage() {
  return (
    <PageShell>
      <h1 style={{ fontSize: '1.6rem' }}>Developers</h1>
      <p style={{ color: '#555', maxWidth: 680, lineHeight: 1.6 }}>
        AgentProof exposes a read-only JSON API so another application can ask:
        &quot;what evidence does AgentProof have for this ERC-8004 agent?&quot; No API key
        is required in V0.
      </p>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Integration pattern</h2>
        <ol style={{ color: '#444', lineHeight: 1.9, paddingLeft: '1.2rem' }}>
          <li>
            Look up the agent: <code>GET /api/v1/agents/:chain/:id</code> — 404 means
            AgentProof has no evidence for this agent yet.
          </li>
          <li>
            Fetch reliability: <code>GET /api/v1/agents/:chain/:id/reliability</code> —
            check <code>dataSufficiency</code> on the window you care about before
            displaying <code>availabilityPct</code>.
          </li>
          <li>
            Optionally fetch reputation integrity:{' '}
            <code>GET /api/v1/agents/:chain/:id/reputation-integrity</code>.
          </li>
        </ol>
        <p style={{ color: '#444', maxWidth: 680 }}>
          Missing data is never returned as a fabricated zero — an insufficient-evidence
          window simply omits <code>availabilityPct</code> rather than showing 0%.
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Example request</h2>
        <pre
          style={{
            background: '#f5f5f5',
            padding: '1rem',
            borderRadius: 6,
            overflowX: 'auto',
            fontSize: '0.85rem',
          }}
        >
          {`curl https://agentproof.example/api/v1/agents/bsc/1234/reliability`}
        </pre>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Full API reference</h2>
        <p style={{ color: '#444', maxWidth: 680 }}>
          Every route, parameter, and response shape is documented in{' '}
          <a href="https://github.com/agentproof/agentproof/blob/main/docs/API.md">
            API.md
          </a>
          .
        </p>
      </section>
    </PageShell>
  );
}
