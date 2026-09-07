import { PageShell } from '@/components/PageShell';
import { CopyButton } from '@/components/CopyButton';
import {
  Code,
  Zap,
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
          AgentProof API Reference
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
          A free, public REST API for querying onchain agent reliability data on BNB Chain.
          No API key required. CORS enabled across all endpoints — seamlessly query from frontends, smart contracts, or autonomous orchestrators.
        </p>
      </div>

      {/* Base URL + Key Properties */}
      <section className="card" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'var(--bg-surface-1)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Production Base URL
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
              {baseUrl}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <CopyButton text={baseUrl} label="Copy Base URL" />
            <span
              className="badge font-mono"
              style={{
                background: 'var(--status-success-bg)',
                color: 'var(--status-success)',
                border: '1px solid var(--status-success-border)',
              }}
            >
              FREE · NO API KEY
            </span>
            <span
              className="badge font-mono"
              style={{
                background: 'var(--status-limited-bg)',
                color: 'var(--status-limited)',
                border: '1px solid var(--status-limited-border)',
              }}
            >
              CORS ENABLED (*)
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Authentication', value: 'None required' },
            { label: 'Rate Limiting', value: 'Fair use' },
            { label: 'Response Format', value: 'JSON' },
            { label: 'CORS', value: 'All origins (*)' },
            { label: 'Cache', value: '30s CDN cache' },
            { label: 'Versioning', value: '/api/v1/*' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '0.75rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{label}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Endpoint Index Table */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Endpoints
        </h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Description</th>
                <th>Cache</th>
              </tr>
            </thead>
            <tbody>
              {[
                { method: 'GET', path: '/health', desc: 'Service health & probe freshness', cache: 'No cache' },
                { method: 'GET', path: '/methodology', desc: 'Scoring methodology versions & docs', cache: '5 min' },
                { method: 'GET', path: '/agents', desc: 'Paginated list of monitored agents', cache: '30 s' },
                { method: 'GET', path: '/agents/:chain/:id', desc: 'Single agent identity & metadata', cache: '30 s' },
                { method: 'GET', path: '/agents/:chain/:id/reliability', desc: 'Uptime % & latency across 24h / 7d / 30d', cache: '30 s' },
                { method: 'GET', path: '/agents/:chain/:id/reputation-integrity', desc: 'Review diversity & integrity signals', cache: '60 s' },
                { method: 'GET', path: '/agents/:chain/:id/services', desc: 'Declared service endpoints & protocols', cache: '30 s' },
                { method: 'GET', path: '/agents/:chain/:id/observations', desc: 'Raw probe observation history', cache: 'No cache' },
                { method: 'GET', path: '/agents/:chain/:id/badge.svg', desc: 'Embeddable live SVG badge', cache: '60 s' },
              ].map(({ method, path, desc, cache }) => (
                <tr key={path}>
                  <td>
                    <span className="badge" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', fontSize: '0.7rem' }}>
                      {method}
                    </span>
                  </td>
                  <td><code className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--accent-bnb)' }}>{path}</code></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{desc}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{cache}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detailed Endpoint Docs */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
          Endpoint Reference
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* GET /health */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>GET</span>
                <code className="font-mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>/health</code>
              </div>
              <CopyButton text={`curl ${baseUrl}/health`} label="Copy curl" />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              Returns service status and the timestamp of the most recent completed probe run. Use <code className="font-mono">freshness</code> to verify data is current (<code className="font-mono">FRESH</code> = run within last 3 hours).
            </p>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: '#38bdf8', overflowX: 'auto' }}>
{`curl "${baseUrl}/health"`}
            </pre>
            <details style={{ marginTop: '0.75rem' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', userSelect: 'none' }}>▸ Sample Response</summary>
              <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: 'var(--text-secondary)', overflowX: 'auto', marginTop: '0.5rem' }}>
{`{
  "status": "ok",
  "service": "agentproof",
  "timestamp": "2026-09-07T19:41:07.093Z",
  "version": "0.1.0",
  "monitoring": {
    "status": "active",
    "latestRunAt": "2026-09-07T19:40:13.358Z",
    "freshness": "FRESH"
  }
}`}
              </pre>
            </details>
          </div>

          {/* GET /agents */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>GET</span>
                <code className="font-mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>/agents</code>
              </div>
              <CopyButton text={`curl "${baseUrl}/agents?chain=bsc&limit=10"`} label="Copy curl" />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              Paginated list of all monitored ERC-8004 agents. Supports cursor-based pagination via <code className="font-mono">nextCursor</code>. Accepts chain aliases like <code className="font-mono">bsc</code>, <code className="font-mono">56</code>, <code className="font-mono">bnb</code>.
            </p>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Query Parameters</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {[
                  { param: 'chain', desc: 'Filter by chain: bsc (or 56, bnb)' },
                  { param: 'limit', desc: 'Items per page. Default: 20, max: 100' },
                  { param: 'cursor', desc: 'Pagination cursor from previous nextCursor' },
                ].map(({ param, desc }) => (
                  <div key={param} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.82rem', alignItems: 'flex-start' }}>
                    <code className="font-mono" style={{ color: 'var(--accent-bnb)', whiteSpace: 'nowrap', minWidth: 60 }}>{param}</code>
                    <span style={{ color: 'var(--text-secondary)' }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: '#38bdf8', overflowX: 'auto' }}>
{`curl "${baseUrl}/agents?chain=bsc&limit=3"`}
            </pre>
            <details style={{ marginTop: '0.75rem' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', userSelect: 'none' }}>▸ Sample Response</summary>
              <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: 'var(--text-secondary)', overflowX: 'auto', marginTop: '0.5rem' }}>
{`{
  "data": {
    "items": [
      {
        "id": "bsc:49637",
        "chain": "bsc",
        "onchainId": "49637",
        "registryAddress": "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
        "provenance": {
          "source": "INDEXER",
          "origin": "8004scan",
          "observedAt": "2026-09-07T13:40:13.358Z"
        }
      }
    ],
    "nextCursor": "bsc:338366"
  },
  "generatedAt": "2026-09-07T20:26:37.417Z"
}`}
              </pre>
            </details>
          </div>

          {/* GET /agents/:chain/:id/reliability */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>GET</span>
                <code className="font-mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>/agents/:chain/:id/reliability</code>
              </div>
              <CopyButton text={`curl "${baseUrl}/agents/bsc/bsc:2518/reliability"`} label="Copy curl" />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              The flagship endpoint. Returns empirical availability %, latency percentiles, and consecutive failure counts across three sliding windows: <code className="font-mono">24h</code>, <code className="font-mono">7d</code>, and <code className="font-mono">30d</code>. All measurements are independent — AgentProof probes each agent, not the agent reporting its own status.
            </p>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: '#38bdf8', overflowX: 'auto' }}>
{`curl "${baseUrl}/agents/bsc/bsc:2518/reliability"`}
            </pre>
            <details style={{ marginTop: '0.75rem' }} open>
              <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', userSelect: 'none' }}>▸ Sample Response (Live bsc:2518 - PancakeSwap)</summary>
              <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: 'var(--text-secondary)', overflowX: 'auto', marginTop: '0.5rem' }}>
{`{
  "data": {
    "windows": {
      "24h": {
        "agentId": "bsc:2518",
        "window": "24h",
        "sufficientData": true,
        "dataSufficiency": "MODERATE",
        "observationCount": 32,
        "successCount": 28,
        "failureCount": 4,
        "availabilityPct": 87.5,
        "medianLatencyMs": 270,
        "p95LatencyMs": 5732,
        "lastSuccessfulProbeAt": "2026-09-07T13:41:05.287Z",
        "lastProbeAt": "2026-09-07T13:41:05.287Z",
        "consecutiveFailures": 0,
        "methodologyVersion": "0.1.0",
        "computedAt": "2026-09-07T20:26:00.424Z"
      },
      "7d": {
        "agentId": "bsc:2518",
        "window": "7d",
        "sufficientData": true,
        "dataSufficiency": "STRONG",
        "observationCount": 240,
        "successCount": 196,
        "failureCount": 44,
        "availabilityPct": 81.67,
        "medianLatencyMs": 269,
        "p95LatencyMs": 721
      },
      "30d": {
        "agentId": "bsc:2518",
        "window": "30d",
        "sufficientData": true,
        "dataSufficiency": "MODERATE",
        "observationCount": 312,
        "successCount": 259,
        "failureCount": 53,
        "availabilityPct": 83.01,
        "medianLatencyMs": 267,
        "p95LatencyMs": 583
      }
    }
  },
  "generatedAt": "2026-09-07T20:26:00.439Z"
}`}
              </pre>
            </details>
            <div style={{ marginTop: '0.85rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Key Response Fields</div>
              <div className="table-container">
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Type</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { field: 'availabilityPct', type: 'number | null', desc: 'Empirical uptime % over the window. Null if no probes yet.' },
                      { field: 'dataSufficiency', type: 'string', desc: 'INSUFFICIENT / LIMITED / MODERATE / STRONG — weight decisions accordingly.' },
                      { field: 'medianLatencyMs', type: 'number | null', desc: 'Median response latency in ms across successful probes.' },
                      { field: 'p95LatencyMs', type: 'number | null', desc: '95th percentile latency. High = occasional latency spikes.' },
                      { field: 'consecutiveFailures', type: 'number', desc: 'Current sequential failure count. >3 means agent is likely degraded.' },
                      { field: 'lastProbeAt', type: 'ISO 8601', desc: 'Timestamp of the most recent probe attempt.' },
                      { field: 'methodologyVersion', type: 'string', desc: 'Scoring formula version so historical data stays interpretable.' },
                    ].map(({ field, type, desc }) => (
                      <tr key={field}>
                        <td><code className="font-mono" style={{ color: 'var(--accent-bnb)', fontSize: '0.78rem' }}>{field}</code></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{type}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* GET /agents/:chain/:id */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>GET</span>
                <code className="font-mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>/agents/:chain/:id</code>
              </div>
              <CopyButton text={`curl "${baseUrl}/agents/bsc/bsc:2518"`} label="Copy curl" />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              Resolves a single agent's onchain identity and metadata. <code className="font-mono">:id</code> accepts both <code className="font-mono">bsc:2518</code> and plain <code className="font-mono">2518</code>. Returns <code className="font-mono">404</code> if AgentProof has not yet indexed the agent.
            </p>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: '#38bdf8', overflowX: 'auto' }}>
{`curl "${baseUrl}/agents/bsc/bsc:2518"`}
            </pre>
          </div>

          {/* GET /agents/:chain/:id/services */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>GET</span>
                <code className="font-mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>/agents/:chain/:id/services</code>
              </div>
              <CopyButton text={`curl "${baseUrl}/agents/bsc/bsc:2518/services"`} label="Copy curl" />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              Returns the agent's declared service endpoints as published in their onchain ERC-8004 metadata. Protocol can be <code className="font-mono">HTTP</code>, <code className="font-mono">A2A</code>, <code className="font-mono">MCP</code>, or <code className="font-mono">UNKNOWN</code>.
            </p>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: '#38bdf8', overflowX: 'auto' }}>
{`curl "${baseUrl}/agents/bsc/bsc:2518/services"`}
            </pre>
          </div>

          {/* GET /agents/:chain/:id/reputation-integrity */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>GET</span>
                <code className="font-mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>/agents/:chain/:id/reputation-integrity</code>
              </div>
              <CopyButton text={`curl "${baseUrl}/agents/bsc/bsc:2518/reputation-integrity"`} label="Copy curl" />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              Computes reviewer diversity metrics to flag potential review manipulation or Sybil behavior. Returns <code className="font-mono">reviewerConcentration</code> and <code className="font-mono">integritySignals</code> for detected anomalies.
            </p>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: '#38bdf8', overflowX: 'auto' }}>
{`curl "${baseUrl}/agents/bsc/bsc:2518/reputation-integrity"`}
            </pre>
          </div>

          {/* GET /agents/:chain/:id/observations */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>GET</span>
                <code className="font-mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>/agents/:chain/:id/observations</code>
              </div>
              <CopyButton text={`curl "${baseUrl}/agents/bsc/bsc:2518/observations?limit=10"`} label="Copy curl" />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              Raw append-only probe log. Every probe AgentProof has ever run against this agent, timestamped with outcome, latency, HTTP status, and failure reason. Supports <code className="font-mono">since</code>, <code className="font-mono">until</code>, and <code className="font-mono">serviceId</code> filters.
            </p>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: '#38bdf8', overflowX: 'auto' }}>
{`curl "${baseUrl}/agents/bsc/bsc:2518/observations?limit=10"`}
            </pre>
          </div>

          {/* GET /agents/:chain/:id/badge.svg */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge" style={{ background: 'rgba(240,185,11,0.12)', color: 'var(--accent-bnb)' }}>GET</span>
                <code className="font-mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>/agents/:chain/:id/badge.svg</code>
              </div>
              <CopyButton
                text={`[![AgentProof](https://agentproof-rho.vercel.app/api/v1/agents/bsc/bsc:2518/badge.svg)](https://agentproof-rho.vercel.app/agents/bsc/bsc:2518)`}
                label="Copy Markdown"
              />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              Dynamic SVG badge for embedding in GitHub READMEs, documentation, or websites. Automatically reflects the agent's live 24h uptime % and median latency. Color-coded: green ≥ 90%, amber ≥ 70%, red below.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="${baseUrl}/agents/bsc/bsc:2518/badge.svg"
                alt="AgentProof live badge preview"
                style={{ height: 20 }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>↑ Live badge — bsc:2518 (PancakeSwap)</span>
            </div>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: 'var(--text-secondary)', overflowX: 'auto' }}>
{`<!-- Markdown -->
[![AgentProof](${baseUrl}/agents/bsc/bsc:2518/badge.svg)](https://agentproof-rho.vercel.app/agents/bsc/bsc:2518)

<!-- HTML -->
<img src="${baseUrl}/agents/bsc/bsc:2518/badge.svg" alt="AgentProof" />`}
            </pre>
          </div>

        </div>
      </section>

      {/* Integration Code Samples */}
      <section className="card" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Integration Examples
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Drop-in guard functions for checking agent health before delegating tasks or initiating onchain payments.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                TypeScript / Node.js
              </span>
              <CopyButton
                text={`async function isAgentHealthy(agentId: string): Promise<boolean> {
  const res = await fetch(\`https://agentproof-rho.vercel.app/api/v1/agents/bsc/\${agentId}/reliability\`);
  if (!res.ok) return false;
  const { data } = await res.json();
  const w24 = data?.windows?.['24h'];
  return (w24?.availabilityPct ?? 0) >= 90.0 && (w24?.consecutiveFailures ?? 0) === 0;
}`}
                label="Copy TS"
              />
            </div>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: '#38bdf8', overflowX: 'auto' }}>
{`async function isAgentHealthy(agentId: string): Promise<boolean> {
  const res = await fetch(\`https://agentproof-rho.vercel.app/api/v1/agents/bsc/\${agentId}/reliability\`);
  if (!res.ok) return false;
  const { data } = await res.json();
  const w24 = data?.windows?.['24h'];
  // Require ≥90% uptime and no consecutive failures
  return (w24?.availabilityPct ?? 0) >= 90.0 && (w24?.consecutiveFailures ?? 0) === 0;
}`}
            </pre>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                Python
              </span>
              <CopyButton
                text={`import requests

def is_agent_healthy(agent_id: str) -> bool:
    resp = requests.get(
        f"https://agentproof-rho.vercel.app/api/v1/agents/bsc/{agent_id}/reliability",
        timeout=3
    )
    if resp.status_code != 200:
        return False
    w24 = resp.json().get("data", {}).get("windows", {}).get("24h", {})
    return w24.get("availabilityPct", 0) >= 90.0 and w24.get("consecutiveFailures", 0) == 0`}
                label="Copy Python"
              />
            </div>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: '#34d399', overflowX: 'auto' }}>
{`import requests

def is_agent_healthy(agent_id: str) -> bool:
    resp = requests.get(
        f"https://agentproof-rho.vercel.app/api/v1/agents/bsc/{agent_id}/reliability",
        timeout=3
    )
    if resp.status_code != 200:
        return False
    w24 = resp.json().get("data", {}).get("windows", {}).get("24h", {})
    return w24.get("availabilityPct", 0) >= 90.0 and w24.get("consecutiveFailures", 0) == 0`}
            </pre>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                curl (shell)
              </span>
              <CopyButton
                text={`curl -s "https://agentproof-rho.vercel.app/api/v1/agents/bsc/bsc:2518/reliability" | jq '.data.windows["24h"].availabilityPct'`}
                label="Copy curl"
              />
            </div>
            <pre style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 6, fontSize: '0.78rem', color: '#94a3b8', overflowX: 'auto' }}>
{`# Get 24h uptime % for agent bsc:2518
curl -s "${baseUrl}/agents/bsc/bsc:2518/reliability" \\
  | jq '.data.windows["24h"].availabilityPct'

# Output: 87.5`}
            </pre>
          </div>

        </div>
      </section>

      {/* Error Codes */}
      <section className="card" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          Error Codes
        </h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>HTTP</th>
                <th>code</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { status: '200', code: '—', desc: 'Success. Data is in the data envelope.' },
                { status: '400', code: 'VALIDATION_ERROR', desc: 'Invalid query parameters (e.g. unknown chain).' },
                { status: '404', code: 'NOT_FOUND', desc: 'Agent not yet indexed by AgentProof.' },
                { status: '405', code: 'METHOD_NOT_ALLOWED', desc: 'Only GET is supported on this route.' },
                { status: '500', code: 'INTERNAL_ERROR', desc: 'Database or upstream error. Retry after a moment.' },
              ].map(({ status, code, desc }) => (
                <tr key={status}>
                  <td>
                    <span
                      className="badge font-mono"
                      style={{
                        background: status === '200' ? 'var(--status-success-bg)' : status === '404' ? 'var(--status-warning-bg)' : 'var(--status-failure-bg)',
                        color: status === '200' ? 'var(--status-success)' : status === '404' ? 'var(--status-warning)' : 'var(--status-failure)',
                        fontSize: '0.75rem',
                      }}
                    >
                      {status}
                    </span>
                  </td>
                  <td><code className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{code}</code></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer note */}
      <div style={{ padding: '1.25rem', background: 'var(--accent-bnb-subtle)', border: '1px solid var(--accent-bnb-border)', borderRadius: 8, display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <Zap size={16} color="var(--accent-bnb)" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-bnb)', marginBottom: '0.25rem' }}>Open Infrastructure</div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            AgentProof is open-source and free to use. The API has no rate limits beyond fair-use abuse prevention.
            All measurements are produced independently by AgentProof — agents do not self-report.
            Source code:{' '}
            <a
              href="https://github.com/ademikelz19-hub/agentproof"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-bnb)', textDecoration: 'underline' }}
            >
              github.com/ademikelz19-hub/agentproof
            </a>
          </p>
        </div>
      </div>
    </PageShell>
  );
}
