import { PageShell } from '@/components/PageShell';
import { SufficiencyBadge, OutcomeBadge, ProvenanceBadge } from '@/components/Badges';
import {
  Shield,
  BookOpen,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Database,
  Layers,
  FileText,
  Clock,
  Zap,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function MethodologyPage() {
  return (
    <PageShell>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem', maxWidth: 800 }}>
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
          <BookOpen size={12} />
          <span>TECHNICAL SPECIFICATION • V0.1.0</span>
        </div>

        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '0.75rem',
            color: 'var(--text-primary)',
          }}
        >
          Transparent Reliability Methodology
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
          AgentProof measures autonomous onchain agents using deterministic, reproducible formulas and SSRF-hardened network probes. Every metric displayed in our Passports and API traces directly back to the mechanisms documented below.
        </p>
      </div>

      {/* 1. Identity vs. Operability */}
      <section id="identity-vs-operability" className="card" style={{ padding: '1.75rem', marginBottom: '2rem', scrollMarginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Shield size={20} color="var(--accent-bnb)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            1. Identity vs. Runtime Operability
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          Onchain standards such as <strong>ERC-8004</strong> prove that an agent identity exists and was minted on BNB Chain. However, onchain registration says nothing about whether the advertised service, API endpoint, or agent-to-agent protocol is currently reachable or operational.
        </p>
        <div
          style={{
            padding: '1rem',
            background: 'var(--bg-surface-2)',
            borderRadius: 6,
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            borderLeft: '3px solid var(--accent-bnb)',
          }}
        >
          <strong>Core Principle:</strong> AgentProof treats onchain registration exclusively as an identity declaration, never as evidence of operational uptime. Runtime reliability is continuously and independently measured.
        </div>
      </section>

      {/* 2. The 5 Deterministic Probes */}
      <section id="deterministic-probes" className="card" style={{ padding: '1.75rem', marginBottom: '2rem', scrollMarginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Activity size={20} color="var(--status-strong)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            2. The 5 Deterministic Probe Types
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Autonomous probes execute against agent services on a scheduled cadence using our hardened probe engine:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              <span className="font-mono" style={{ color: 'var(--accent-bnb)', fontSize: '0.8rem' }}>01</span>
              <span>METADATA_RESOLUTION</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Resolves the agent&apos;s advertised metadata URI over HTTP(S) or IPFS gateways, enforcing strict 1MB response size limits.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              <span className="font-mono" style={{ color: 'var(--accent-bnb)', fontSize: '0.8rem' }}>02</span>
              <span>SERVICE_REACHABILITY</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Executes DNS resolution and TCP/TLS handshake with DNS pinning to verify that the host is reachable from public IP networks.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              <span className="font-mono" style={{ color: 'var(--accent-bnb)', fontSize: '0.8rem' }}>03</span>
              <span>HTTP_STATUS</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Checks that the endpoint returns standard valid HTTP response codes (2xx/3xx/405/422). 5xx errors or connection drops record as failure.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              <span className="font-mono" style={{ color: 'var(--accent-bnb)', fontSize: '0.8rem' }}>04</span>
              <span>RESPONSE_LATENCY</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Measures high-resolution round-trip time in milliseconds (median and P95 percentiles) from probe dispatch to header arrival.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              <span className="font-mono" style={{ color: 'var(--accent-bnb)', fontSize: '0.8rem' }}>05</span>
              <span>PROTOCOL_RESPONSE_VALIDITY</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Validates that the returned payload adheres to expected MIME types and JSON structure without malformed syntax.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Reliability Calculations */}
      <section id="measured-availability" className="card" style={{ padding: '1.75rem', marginBottom: '2rem', scrollMarginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Zap size={20} color="var(--status-limited)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            3. Availability &amp; Latency Formulas
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          Measured Availability is computed over explicit sliding windows (<strong>24 Hours</strong>, <strong>7 Days</strong>, and <strong>30 Days</strong>):
        </p>

        <div
          style={{
            padding: '1.25rem',
            background: 'var(--bg-surface-2)',
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
            overflowX: 'auto',
          }}
        >
          Measured Availability % = ( Successful Attributable Probes / Total Attributable Probes ) * 100
        </div>

        <h3 id="attributable-outcomes" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)', scrollMarginTop: '2rem' }}>
          Attributable vs. Excluded Outcomes
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          To guarantee rigorous fairness, AgentProof partitions probe outcomes into two strict categories:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <strong style={{ color: 'var(--status-success)', display: 'block', marginBottom: '0.4rem' }}>
              ✓ Attributable Outcomes (Count in Denominator)
            </strong>
            <ul style={{ paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              <li><code className="font-mono">SUCCESS</code>: Endpoint responded within parameters.</li>
              <li><code className="font-mono">AGENT_UNREACHABLE</code>: Agent server dropped connection or refused TCP.</li>
              <li><code className="font-mono">DNS_FAILURE</code>: Agent hostname failed public resolution.</li>
              <li><code className="font-mono">TIMEOUT</code>: Agent service exceeded the 10-second timeout.</li>
              <li><code className="font-mono">PROTOCOL_INVALID</code>: Agent returned HTTP 5xx or malformed payload.</li>
            </ul>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <strong style={{ color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
              ⊘ Excluded Outcomes (Never Penalize Availability)
            </strong>
            <ul style={{ paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              <li><code className="font-mono">BLOCKED_BY_SECURITY_POLICY</code>: Target was an RFC1918/localhost IP blocked by runner security policy.</li>
              <li><code className="font-mono">UPSTREAM_INDEXER_FAILURE</code>: 8004scan or RPC gateway was unavailable.</li>
              <li><code className="font-mono">AGENTPROOF_INTERNAL_ERROR</code>: Runner internal execution error.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Evidence Sufficiency Tiers */}
      <section id="evidence-coverage" className="card" style={{ padding: '1.75rem', marginBottom: '2rem', scrollMarginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <FileText size={20} color="var(--status-moderate)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            4. Evidence Sufficiency Tiers
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Every reliability percentage is paired with an explicit sufficiency tier that communicates sample depth:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
            <SufficiencyBadge tier="STRONG" />
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              30+ observations spanning at least 75% of the window duration. Statistically robust sample.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
            <SufficiencyBadge tier="MODERATE" />
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              10–29 observations with regular temporal spread. Representative operational profile.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
            <SufficiencyBadge tier="LIMITED" />
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              3–9 observations. Early measurement history; displayed with preliminary sample notice.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
            <SufficiencyBadge tier="INSUFFICIENT" />
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Fewer than 3 observations. Availability percentage is intentionally withheld to prevent unrepresentative conclusions.
            </span>
          </div>
        </div>
      </section>

      {/* 5. Reputation Integrity */}
      <section id="reputation-integrity" className="card" style={{ padding: '1.75rem', marginBottom: '2rem', scrollMarginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Layers size={20} color="var(--accent-bnb)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            5. Onchain Reputation Evidence &amp; Reviewer Distribution
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          AgentProof analyzes 8004scan onchain feedback data to evaluate reviewer diversity and concentration using non-accusatory statistical metrics:
        </p>

        <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>
            <strong>Herfindahl-Hirschman Reviewer Concentration (HHI):</strong> Measures whether feedback is dominated by a small number of wallet addresses.
          </li>
          <li>
            <strong>Reviewer Diversity Ratio:</strong> The fraction of total feedback records submitted by unique wallets (<code className="font-mono">uniqueReviewers / totalFeedback</code>).
          </li>
          <li>
            <strong>Neutral Signal Taxonomy:</strong> Signals such as <code className="font-mono">LOW_REVIEWER_DIVERSITY</code> or <code className="font-mono">HIGH_REVIEWER_CONCENTRATION</code> describe empirical distribution shapes without subjective accusations or blacklisting.
          </li>
        </ul>
      </section>

      {/* 6. Security & SSRF Protections */}
      <section id="probe-policy" className="card" style={{ padding: '1.75rem', marginBottom: '2rem', scrollMarginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Lock size={20} color="var(--status-strong)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            6. Security &amp; Probe Policy
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          Probing arbitrary third-party endpoints carries inherent SSRF risks. AgentProof implements strict security controls tested by 36 adversarial IP-policy tests:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>DNS Pinning</strong>
            Resolves IP once and connects strictly to verified public IP addresses, preventing DNS rebinding attacks.
          </div>
          <div style={{ padding: '0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>RFC1918 &amp; Cloud Blocklist</strong>
            Immediately terminates probes targeting 10.x, 172.16.x, 192.168.x, 127.0.0.1, or 169.254.169.254 (AWS/GCP metadata).
          </div>
          <div style={{ padding: '0.85rem', background: 'var(--bg-surface-2)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>Ethical Rate Limiting</strong>
            Global concurrency cap (10), per-host cap (2), minimum 5-second interval, and automatic cooldown backoff.
          </div>
        </div>
      </section>

      {/* 7. Explicit Limitations */}
      <section id="limitations" className="card" style={{ padding: '1.75rem', scrollMarginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          7. Explicit Limitations &amp; Boundaries
        </h2>
        <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>
            <strong>Reachability is not correctness:</strong> A successful HTTP 200 response proves the agent&apos;s server is online, not that its internal AI reasoning or financial transactions are bug-free.
          </li>
          <li>
            <strong>Append-only application level:</strong> Observations are append-only at the application layer. Proofs are not yet committed to zero-knowledge rollups.
          </li>
          <li>
            <strong>No financial guarantees:</strong> AgentProof evidence is an informational metric for builders, orchestrators, and indexers.
          </li>
        </ul>
      </section>
    </PageShell>
  );
}
