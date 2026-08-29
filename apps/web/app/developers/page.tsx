import { PageShell } from '@/components/PageShell';
import { CopyButton } from '@/components/CopyButton';
import {
  Code,
  Terminal,
  Zap,
  Layers,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Server,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DevelopersPage() {
  const baseUrl = 'https://agentproof-rho.vercel.app/api/v1';

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
          <Code size={12} />
          <span>DEVELOPER INFRASTRUCTURE • REST API</span>
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
          Developer API &amp; Integration Guide
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
          AgentProof exposes a high-performance read-only JSON API enabling onchain orchestrators, agent frameworks (such as AgentFlow), and indexers to query empirical agent reliability before delegating tasks or transferring funds.
        </p>
      </div>

      {/* 1. Base URL & Authentication Strip */}
      <section className="card" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'var(--bg-surface-1)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Public Production API Base URL
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
              {baseUrl}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <CopyButton text={baseUrl} label="Copy Base URL" />
            <span
              className="badge font-mono"
              style={{
                background: 'var(--status-success-bg)',
                color: 'var(--status-success)',
                border: '1px solid var(--status-success-border)',
              }}
            >
              FREE • NO API KEY REQUIRED
            </span>
          </div>
        </div>
      </section>

      {/* 2. Endpoint Matrix */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Available REST Endpoints
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          All endpoints return standard JSON envelopes with bounded pagination, RFC3339 timestamps, and explicit provenance.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Endpoint 1: List Agents */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  GET
                </span>
                <span className="font-mono" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  /agents
                </span>
              </div>
              <CopyButton text={`curl ${baseUrl}/agents?chain=bsc&limit=10`} label="Copy curl" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              List monitored agents on a chain with cursor-based pagination. Supported params: <code className="font-mono">chain=bsc</code>, <code className="font-mono">limit=10</code>, <code className="font-mono">cursor</code>.
            </p>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.75rem', borderRadius: 6, fontSize: '0.78rem', color: 'var(--text-secondary)', overflowX: 'auto' }}>
              {`curl "${baseUrl}/agents?chain=bsc&limit=10"`}
            </pre>
          </div>

          {/* Endpoint 2: Reliability Windows */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  GET
                </span>
                <span className="font-mono" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  /agents/:chain/:id/reliability
                </span>
              </div>
              <CopyButton text={`curl ${baseUrl}/agents/bsc/bsc:316380/reliability`} label="Copy curl" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Returns empirical availability %, observation counts, consecutive failures, and median/P95 latencies across 24h, 7d, and 30d sliding windows.
            </p>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.75rem', borderRadius: 6, fontSize: '0.78rem', color: 'var(--text-secondary)', overflowX: 'auto' }}>
              {`curl "${baseUrl}/agents/bsc/bsc:316380/reliability"`}
            </pre>
          </div>

          {/* Endpoint 3: Reputation Integrity */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  GET
                </span>
                <span className="font-mono" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  /agents/:chain/:id/reputation-integrity
                </span>
              </div>
              <CopyButton text={`curl ${baseUrl}/agents/bsc/bsc:316380/reputation-integrity`} label="Copy curl" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Returns reviewer diversity ratios, unique reviewer counts, concentration indexes, and neutral integrity signals.
            </p>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.75rem', borderRadius: 6, fontSize: '0.78rem', color: 'var(--text-secondary)', overflowX: 'auto' }}>
              {`curl "${baseUrl}/agents/bsc/bsc:316380/reputation-integrity"`}
            </pre>
          </div>

          {/* Endpoint 4: Services */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  GET
                </span>
                <span className="font-mono" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  /agents/:chain/:id/services
                </span>
              </div>
              <CopyButton text={`curl ${baseUrl}/agents/bsc/bsc:316380/services`} label="Copy curl" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Returns declared endpoints, supported protocols (HTTP, A2A, MCP), and service-level reachability metadata.
            </p>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.75rem', borderRadius: 6, fontSize: '0.78rem', color: 'var(--text-secondary)', overflowX: 'auto' }}>
              {`curl "${baseUrl}/agents/bsc/bsc:316380/services"`}
            </pre>
          </div>
        </div>
      </section>

      {/* 3. Live Response Example */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Sample JSON Response (bsc:316380)
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Exact live response payload returned by the <code className="font-mono">/reliability</code> route:
        </p>

        <div className="card" style={{ padding: '1rem', background: 'var(--bg-surface-1)' }}>
          <pre
            style={{
              padding: '1rem',
              background: 'var(--bg-surface-2)',
              borderRadius: 6,
              fontSize: '0.8rem',
              color: '#38bdf8',
              overflowX: 'auto',
              maxHeight: 380,
            }}
          >
{`{
  "data": {
    "windows": {
      "24h": {
        "agentId": "bsc:316380",
        "window": "24h",
        "sufficientData": true,
        "dataSufficiency": "LIMITED",
        "observationCount": 18,
        "successCount": 14,
        "failureCount": 4,
        "availabilityPct": 77.78,
        "medianLatencyMs": 386,
        "p95LatencyMs": 2020,
        "lastSuccessfulProbeAt": "2026-08-29T08:07:17.947Z",
        "lastProbeAt": "2026-08-29T08:07:17.947Z",
        "consecutiveFailures": 0,
        "methodologyVersion": "0.1.0",
        "computedAt": "2026-08-29T09:43:34.048Z"
      }
    }
  },
  "generatedAt": "2026-08-29T09:43:34.062Z"
}`}
          </pre>
        </div>
      </section>

      {/* 4. AgentFlow / Orchestrator Integration Pattern */}
      <section className="card" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          Orchestrator Integration Pattern
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          When integrating AgentProof into an autonomous workflow (e.g. AgentFlow):
        </p>

        <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>
            <strong>Check Agent Existence:</strong> Query <code className="font-mono">GET /agents/bsc/:id</code>. HTTP 404 indicates AgentProof has no observed record.
          </li>
          <li>
            <strong>Verify Evidence Sufficiency:</strong> Inspect <code className="font-mono">dataSufficiency</code> on the desired window (e.g. 24h). Only evaluate availability % if sufficiency is <code className="font-mono">LIMITED</code>, <code className="font-mono">MODERATE</code>, or <code className="font-mono">STRONG</code>.
          </li>
          <li>
            <strong>Inspect Concurrency &amp; Latency:</strong> Check <code className="font-mono">medianLatencyMs</code> and <code className="font-mono">consecutiveFailures</code> before initiating latency-sensitive payments or routing.
          </li>
        </ol>
      </section>
    </PageShell>
  );
}
