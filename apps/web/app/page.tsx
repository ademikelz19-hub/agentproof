import { PageShell } from '@/components/PageShell';

export default function Home() {
  return (
    <PageShell>
      <section style={{ padding: '2rem 0 3rem' }}>
        <h1 style={{ fontSize: '2.25rem', lineHeight: 1.15, margin: '0 0 1rem' }}>AgentProof</h1>
        <p style={{ fontSize: '1.15rem', color: '#333', margin: '0 0 1.5rem' }}>
          Independent reliability evidence for autonomous onchain agents.
        </p>
        <p style={{ fontSize: '1rem', color: '#555', maxWidth: 640, lineHeight: 1.6 }}>
          Registration proves identity. AgentProof measures whether the advertised
          service actually works — reachability, latency, and protocol response
          validity, observed independently and shown with full provenance and
          methodology, never as a manufactured trust score.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          <a
            href="/agents"
            style={{
              padding: '0.7rem 1.3rem',
              background: '#111',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Explore Agents
          </a>
          <a
            href="/methodology"
            style={{
              padding: '0.7rem 1.3rem',
              border: '1px solid #ccc',
              borderRadius: 6,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            View Methodology
          </a>
          <a
            href="/developers"
            style={{
              padding: '0.7rem 1.3rem',
              border: '1px solid #ccc',
              borderRadius: 6,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            Read API Docs
          </a>
        </div>
      </section>

      <section
        style={{
          border: '1px solid #e5e5e5',
          borderRadius: 8,
          padding: '1.25rem 1.5rem',
          background: '#fafafa',
          color: '#444',
          fontSize: '0.95rem',
        }}
      >
        Live BSC measurements will appear here once monitoring is activated.
        AgentProof&apos;s security engine, reliability calculations, and reputation-integrity
        analysis are built and tested (see <a href="/developers">the API docs</a>) —
        the platform is honest about what it has and hasn&apos;t measured yet rather than
        showing placeholder numbers.
      </section>
    </PageShell>
  );
}
