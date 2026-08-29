import Link from 'next/link';
import { Shield, ExternalLink, Code, BookOpen, Activity } from 'lucide-react';
import { GithubIcon } from './Icons';

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface-1)',
        padding: '3rem 1.5rem 2.5rem',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '2.5rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Col 1: Brand & Mission */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: 'var(--accent-bnb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                }}
              >
                <Shield size={15} strokeWidth={2.5} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                AgentProof
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, maxWidth: 320 }}>
              Continuous, independent reachability, latency, and reputation integrity evidence for autonomous onchain agents.
            </p>
            <div
              style={{
                marginTop: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.6rem',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
              }}
            >
              <span>Methodology: Reliability v0.1.0 • Reputation v0.1.0</span>
            </div>
          </div>

          {/* Col 2: Infrastructure Navigation */}
          <div>
            <h3
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: '1rem',
              }}
            >
              Infrastructure
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <li>
                <Link
                  href="/agents"
                  style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Activity size={13} color="var(--accent-bnb)" />
                  <span>Agent Directory</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/methodology"
                  style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <BookOpen size={13} />
                  <span>Transparent Methodology</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/developers"
                  style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Code size={13} />
                  <span>Public API Documentation</span>
                </Link>
              </li>
              <li>
                <a
                  href="/api/v1/agents?chain=bsc&limit=10"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ExternalLink size={13} />
                  <span>Live REST API Endpoint</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Ecosystem & Standards */}
          <div>
            <h3
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: '1rem',
              }}
            >
              Ecosystem &amp; Standards
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <li>
                <span style={{ color: 'var(--text-secondary)' }}>BNB Chain (Chain ID 56)</span>
              </li>
              <li>
                <span style={{ color: 'var(--text-secondary)' }}>ERC-8004 Agent Standard</span>
              </li>
              <li>
                <a
                  href="https://8004scan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <span>8004scan Explorer</span>
                  <ExternalLink size={11} />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ademikelz19-hub/agentproof"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <GithubIcon size={13} />
                  <span>Open Source Repository</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            lineHeight: 1.6,
          }}
        >
          <p>
            <strong>Disclaimer:</strong> Monitoring autonomous agents on BNB Chain. AgentProof is independent developer infrastructure; it is not affiliated with, sponsored by, or endorsed by BNB Chain, Binance, or any monitored agent developers.
          </p>
          <p>
            Measurements are recorded via SSRF-hardened deterministic probes. Reliability calculations reflect empirical reachability and response characteristics over specified sliding windows; they do not constitute financial advice, security audits, or safety guarantees.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span>© {new Date().getFullYear()} AgentProof. Open reliability infrastructure.</span>
            <span className="font-mono">Built with Next.js &amp; Neon Serverless Postgres</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
