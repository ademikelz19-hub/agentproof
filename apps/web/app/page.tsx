import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { MetricCard } from '@/components/MetricCard';
import { OutcomeBadge, ProtocolBadge, SufficiencyBadge, MonitoringStatusBadge } from '@/components/Badges';
import { TimeAgo } from '@/components/TimeAgo';
import { db, agents, services, observations, probeRuns } from '@agentproof/db';
import { count, desc, sql } from 'drizzle-orm';
import {
  Shield,
  Activity,
  ArrowRight,
  Server,
  Database,
  CheckCircle2,
  Lock,
  Layers,
  Code,
  FileCheck,
  Zap,
  ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let totalIndexedAgents = 0;
  let activelyMonitoredAgents = 0;
  let totalServices = 0;
  let totalObservations = 0;
  let latestRun: typeof probeRuns.$inferSelect | null = null;
  let recentObservations: (typeof observations.$inferSelect & { agentName?: string | null })[] = [];
  let featuredAgent: typeof agents.$inferSelect | null = null;
  let featuredServicesCount = 0;
  let featuredObsCount = 0;

  try {
    const [
      agentCountRes,
      serviceCountRes,
      obsCountRes,
      lastRunRes,
      latestObsRes,
      monitoredRes,
      featuredRes,
    ] = await Promise.all([
      db.select({ count: count() }).from(agents),
      db.select({ count: count() }).from(services),
      db.select({ count: count() }).from(observations),
      db.select().from(probeRuns).orderBy(desc(probeRuns.startedAt)).limit(1),
      db.select().from(observations).orderBy(desc(observations.timestamp)).limit(8),
      db.select({ count: sql<number>`count(distinct ${observations.agentId})::int` }).from(observations),
      db.select().from(agents).where(sql`${agents.id} = 'bsc:2518' OR ${agents.id} = 'bsc:316375'`).limit(1),
    ]);

    totalIndexedAgents = agentCountRes[0]?.count ?? 0;
    totalServices = serviceCountRes[0]?.count ?? 0;
    totalObservations = obsCountRes[0]?.count ?? 0;
    latestRun = lastRunRes[0] ?? null;
    recentObservations = latestObsRes ?? [];
    activelyMonitoredAgents = monitoredRes[0]?.count ?? 0;
    featuredAgent = featuredRes[0] ?? null;

    if (featuredAgent) {
      const [featSvc, featObs] = await Promise.all([
        db.select({ count: count() }).from(services).where(sql`${services.agentId} = ${featuredAgent.id}`),
        db.select({ count: count() }).from(observations).where(sql`${observations.agentId} = ${featuredAgent.id}`),
      ]);
      featuredServicesCount = featSvc[0]?.count ?? 0;
      featuredObsCount = featObs[0]?.count ?? 0;
    }
  } catch (err) {
    console.error('Error fetching homepage telemetry:', err);
  }

  return (
    <PageShell>
      {/* 1. Hero Section */}
      <section style={{ padding: '2rem 0 3.5rem', textAlign: 'center', maxWidth: 840, margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.3rem 0.85rem',
            background: 'var(--accent-bnb-subtle)',
            border: '1px solid var(--accent-bnb-border)',
            borderRadius: 9999,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--accent-bnb)',
            marginBottom: '1.5rem',
            letterSpacing: '0.04em',
          }}
        >
          <span className="live-pulse" />
          <span>BNB CHAIN AGENT RELIABILITY INFRASTRUCTURE</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem',
            color: 'var(--text-primary)',
          }}
        >
          Independent reliability evidence for autonomous onchain agents.
        </h1>

        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '2rem',
            maxWidth: 680,
            margin: '0 auto 2rem',
          }}
        >
          Anyone can register an agent identity on BNB Chain. <strong>AgentProof</strong> independently connects to its declared APIs and tools — measuring reachability, response latency, and onchain feedback distribution without opaque scores.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.85rem',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/agents" className="btn btn-primary" style={{ padding: '0.75rem 1.4rem' }}>
            <Activity size={16} />
            <span>Explore Monitored Agents</span>
            <ArrowRight size={15} />
          </Link>
          <Link href="/methodology" className="btn btn-secondary" style={{ padding: '0.75rem 1.4rem' }}>
            <span>Methodology &amp; Formulas</span>
          </Link>
          <Link href="/developers" className="btn btn-secondary" style={{ padding: '0.75rem 1.4rem' }}>
            <Code size={15} />
            <span>Developer API</span>
          </Link>
        </div>

        <div
          style={{
            marginTop: '2.5rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>✓ Scheduled BSC Probing</span>
          <span>•</span>
          <span>✓ Deterministic Calculations</span>
          <span>•</span>
          <span>✓ Reproducible Evidence</span>
          <span>•</span>
          <span>✓ Zero-Cost Public API</span>
        </div>
      </section>

      {/* 2. Genuine Network Telemetry */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Network Telemetry &amp; Coverage
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Persisted empirical measurements recorded to PostgreSQL on BNB Chain.
            </p>
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span className="live-pulse" />
            <span>Continuously Scheduled Monitoring</span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <MetricCard
            label="Agents Indexed"
            value={totalIndexedAgents}
            subvalue="ERC-8004 Registry"
            description="Onchain agents discovered from BNB Chain ERC-8004 registries."
            icon={Shield}
            accent="var(--accent-bnb)"
            tooltip="Total distinct agents discovered and persisted in AgentProof database."
          />
          <MetricCard
            label="Actively Monitored"
            value={activelyMonitoredAgents}
            subvalue="Scheduled Probe Cohort"
            description="Agents with advertised services probed in automated scheduled runs."
            icon={Server}
            accent="var(--status-strong)"
            tooltip="Cohort of agents with eligible endpoints probed during hourly cycles."
          />
          <MetricCard
            label="Retained Observations"
            value={totalObservations.toLocaleString()}
            subvalue="Recorded Measurements"
            description="SSRF-hardened reachability, latency, and protocol probe observations."
            icon={Database}
            accent="var(--status-limited)"
            tooltip="Total individual reachability, latency, and protocol observations recorded."
          />
          <MetricCard
            label="Latest Probe Run"
            value={latestRun?.finishedAt ? <TimeAgo timestamp={latestRun.finishedAt} /> : 'Active'}
            subvalue={latestRun?.finishedAt ? `Completed at ${new Date(latestRun.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC` : 'Hourly Cycle'}
            description={`Tested ${latestRun?.targetAgentCount ?? activelyMonitoredAgents} agents in latest autonomous cycle.`}
            icon={Zap}
            accent="var(--status-moderate)"
            tooltip="Timestamp of the most recent autonomous cloud probe cycle."
          />
        </div>
      </section>

      {/* 3. Featured Real Reliability Passport */}
      {featuredAgent && (
        <section style={{ marginBottom: '4rem' }}>
          <div className="card" style={{ padding: '2rem', background: 'var(--bg-surface-1)', border: '1px solid var(--accent-bnb-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="badge font-mono" style={{ background: 'var(--accent-bnb-subtle)', color: 'var(--accent-bnb)', border: '1px solid var(--accent-bnb-border)' }}>
                    FEATURED EVIDENCE
                  </span>
                  <span className="badge font-mono" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    TOKEN #{featuredAgent.onchainId}
                  </span>
                  <MonitoringStatusBadge isMonitored={true} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {featuredAgent.name ?? featuredAgent.id}
                </h3>
                <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {featuredAgent.id}
                </span>
              </div>

              <Link
                href={`/agents/${featuredAgent.chain}/${featuredAgent.id}`}
                className="btn btn-primary btn-sm"
              >
                <span>View Full Reliability Passport</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {featuredAgent.description && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {featuredAgent.description}
              </p>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                padding: '1rem',
                background: 'var(--bg-surface-2)',
                borderRadius: 6,
                fontSize: '0.8rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Declared Endpoints: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{featuredServicesCount}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Retained Checks: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{featuredObsCount}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Registry: </span>
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>BNB Chain (56)</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Measurement Pipeline Story */}
      <section style={{ marginBottom: '4rem' }}>
        <div className="card" style={{ padding: '2.5rem 2rem', background: 'var(--bg-surface-1)' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              How AgentProof Evaluates Autonomous Agents
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Onchain registration establishes identity. AgentProof establishes whether the advertised service actually answers requests.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                padding: '1.25rem',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-bnb)',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                01 • ONCHAIN IDENTITY
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Agent Registration
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                An agent identity is registered on BNB Chain (ERC-8004) with its wallet ownership and metadata pointer.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                padding: '1.25rem',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--status-limited)',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                02 • ENDPOINTS DECLARED
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Services Advertised
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                The agent advertises public endpoints (HTTP, A2A, MCP) where other onchain agents or users can interact with it.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                padding: '1.25rem',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--status-moderate)',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                03 • AUTONOMOUS PROBES
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Scheduled Telemetry
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                AgentProof runs SSRF-hardened cloud probes — testing reachability, measuring response speed, and logging protocol validity.
              </p>
            </div>

            {/* Step 4 */}
            <div
              style={{
                padding: '1.25rem',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--status-strong-border)',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--status-strong)',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                04 • EVIDENCE LEDGER
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Reliability Passport
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Timestamped evidence is recorded in an open ledger with sliding window availability ratios and onchain feedback distribution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Live Activity Stream */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Probe Telemetry Feed
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Latest automated health checks conducted on BSC agent services.
            </p>
          </div>
          <Link href="/agents" className="btn btn-secondary btn-sm">
            <span>View All Agents</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {recentObservations.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            No recent probe observations recorded. Probing runs automatically every hour.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent Target</th>
                  <th>Probe Type</th>
                  <th>Outcome</th>
                  <th>Latency</th>
                  <th>HTTP Status</th>
                  <th>Observed At</th>
                </tr>
              </thead>
              <tbody>
                {recentObservations.map((obs) => (
                  <tr key={obs.id}>
                    <td>
                      <Link
                        href={`/agents/${obs.chain}/${obs.agentId}`}
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span className="font-mono">{obs.agentId}</span>
                      </Link>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {obs.probeType}
                      </span>
                    </td>
                    <td>
                      <OutcomeBadge outcome={obs.outcome} />
                    </td>
                    <td>
                      {obs.latencyMs !== null ? (
                        <span className="font-mono" style={{ fontWeight: 600 }}>
                          {obs.latencyMs} ms
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {obs.httpStatus ? (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '0.75rem',
                            color: obs.httpStatus >= 200 && obs.httpStatus < 300 ? 'var(--status-success)' : 'var(--status-warning)',
                          }}
                        >
                          HTTP {obs.httpStatus}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        <TimeAgo timestamp={obs.timestamp} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 6. Core Architectural Pillars */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            Engineered for Verifiability &amp; Composability
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Why developer ecosystems and onchain orchestrators rely on AgentProof evidence.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <div style={{ color: 'var(--accent-bnb)' }}>
                <Lock size={20} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>SSRF-Hardened Transport</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              All network probes pass through isolated DNS-pinned transports that block RFC1918 private networks, AWS/GCP metadata endpoints, and internal loopback addresses.
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <div style={{ color: 'var(--status-strong)' }}>
                <FileCheck size={20} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Deterministic Calculations</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Zero AI hallucinated scores. Availability ratios are calculated with reproducible mathematical formulas over explicit 24h, 7d, and 30d observation windows.
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <div style={{ color: 'var(--status-limited)' }}>
                <Code size={20} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Zero-Cost REST API</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Designed for automated routing and orchestrators like AgentFlow. Read endpoints require no API key and provide standard JSON responses with explicit provenance.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
