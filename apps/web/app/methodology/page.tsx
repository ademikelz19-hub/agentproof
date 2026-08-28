import { PageShell } from '@/components/PageShell';

export default function MethodologyPage() {
  return (
    <PageShell>
      <h1 style={{ fontSize: '1.6rem' }}>Methodology</h1>
      <p style={{ color: '#555', maxWidth: 680, lineHeight: 1.6 }}>
        This page explains what AgentProof measures, how, and — just as importantly —
        what it does not claim. Every number shown anywhere in the product traces back
        to one of the mechanisms below.
      </p>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Identity vs. reliability</h2>
        <p style={{ color: '#444', maxWidth: 680, lineHeight: 1.6 }}>
          ERC-8004 registration proves an agent identity was registered onchain. It says
          nothing about whether the advertised service currently works. AgentProof
          measures the second thing independently — it never treats onchain registration
          itself as evidence of reliability.
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Reachability vs. correctness</h2>
        <p style={{ color: '#444', maxWidth: 680, lineHeight: 1.6 }}>
          A successful probe means AgentProof could connect and get a well-formed
          response. It does not mean the response was correct, or that the agent&apos;s
          advertised functionality actually works as described. &quot;HTTP 200&quot; and
          &quot;this agent works correctly&quot; are different claims, and AgentProof never
          conflates them — see <code>PROTOCOL_RESPONSE_VALIDITY</code> in the reliability
          methodology for the (currently HTTP-only) exception.
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Reliability measurement</h2>
        <p style={{ color: '#444', maxWidth: 680, lineHeight: 1.6 }}>
          Five probe types (metadata resolution, service reachability, HTTP status,
          response latency, protocol response validity) run against advertised services
          on a schedule. Every result is stored as an append-only observation with full
          provenance. See the full methodology, including the exact availability/latency
          formulas and evidence-sufficiency rules, in{' '}
          <a href="https://github.com/agentproof/agentproof/blob/main/docs/RELIABILITY_METHODOLOGY.md">
            RELIABILITY_METHODOLOGY.md
          </a>
          .
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Evidence coverage</h2>
        <p style={{ color: '#444', maxWidth: 680, lineHeight: 1.6 }}>
          Every reliability figure carries an explicit sufficiency tier — INSUFFICIENT,
          LIMITED, MODERATE, or STRONG. This is a statement about how much measurement
          coverage backs the number, never a judgment about the agent. &quot;STRONG&quot;
          evidence does not mean &quot;safe agent&quot; — it means AgentProof has enough
          observations, spread widely and recently enough across the window, to show a
          meaningful figure.
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Reputation integrity</h2>
        <p style={{ color: '#444', maxWidth: 680, lineHeight: 1.6 }}>
          AgentProof analyses the shape of available feedback — reviewer concentration,
          diversity, burst patterns — using deterministic, reproducible formulas. It
          never runs ML-based Sybil classification and never labels a reviewer or wallet
          as fake, malicious, or fraudulent. Full formulas and false-positive risks are
          documented in{' '}
          <a href="https://github.com/agentproof/agentproof/blob/main/docs/REPUTATION_INTEGRITY.md">
            REPUTATION_INTEGRITY.md
          </a>
          .
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Limitations</h2>
        <ul style={{ color: '#444', maxWidth: 680, lineHeight: 1.8, paddingLeft: '1.2rem' }}>
          <li>Protocol validation beyond plain HTTP (A2A, MCP) is not implemented yet.</li>
          <li>Sufficiency thresholds are documented, deterministic constants — not a statistical model.</li>
          <li>No feedback-ingestion pipeline exists yet, so reputation evidence is currently empty for every agent.</li>
          <li>Reciprocal-feedback-pattern detection requires cross-agent data AgentProof does not yet have.</li>
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Security &amp; probe policy</h2>
        <p style={{ color: '#444', maxWidth: 680, lineHeight: 1.6 }}>
          Every probe goes through an SSRF-hardened transport (DNS-pinned connections,
          re-validated redirects, strict timeouts and size caps) and respects
          conservative concurrency/backoff limits so AgentProof never becomes a load
          source against the agents it monitors. Full detail in{' '}
          <a href="https://github.com/agentproof/agentproof/blob/main/docs/SECURITY_MODEL.md">
            SECURITY_MODEL.md
          </a>{' '}
          and{' '}
          <a href="https://github.com/agentproof/agentproof/blob/main/docs/PROBE_POLICY.md">
            PROBE_POLICY.md
          </a>
          .
        </p>
      </section>
    </PageShell>
  );
}
