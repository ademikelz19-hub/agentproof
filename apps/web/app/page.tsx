import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { MetricCard } from '@/components/MetricCard';
import { OutcomeBadge, ProtocolBadge } from '@/components/Badges';
import { TimeAgo, LocalTime } from '@/components/TimeAgo';
import { db, agents, services, observations, probeRuns, reputationSnapshots } from '@agentproof/db';
import { count, desc } from 'drizzle-orm';
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
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch genuine metrics directly from Neon PostgreSQL
  let totalAgents = 0;
  let totalServices = 0;
  let totalObservations = 0;
  let latestRun: typeof probeRuns.$inferSelect | null = null;
  let recentObservations: (typeof observations.$inferSelect & { agentName?: string | null })[] = [];

  try {
    const [
      agentCountRes,
      serviceCountRes,
      obsCountRes,
      lastRunRes,
      latestObsRes,
    ] = await Promise.all([
      db.select({ count: count() }).from(agents),
      db.select({ count: count() }).from(services),
      db.select({ count: count() }).from(observations),
      db.select().from(probeRuns).orderBy(desc(probeRuns.startedAt)).limit(1),
      db.select().from(observations).orderBy(desc(observations.timestamp)).limit(10),
    ]);

    totalAgents = agentCountRes[0]?.count ?? 0;
    totalServices = serviceCountRes[0]?.count ?? 0;
    totalObservations = obsCountRes[0]?.count ?? 0;
    latestRun = lastRunRes[0] ?? null;
    recentObservations = latestObsRes ?? [];
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
          Verify if onchain AI agents are actually online and working.
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
          Anyone can register an AI bot on BNB Chain. <strong>AgentProof</strong> independently tests whether its advertised links, APIs, and tools actually work — measuring live uptime, response speeds, and real user reviews without fake scores.
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
            <span>Explore Live Agents</span>
            <ArrowRight size={15} />
          </Link>
          <Link href="/methodology" className="btn btn-secondary" style={{ padding: '0.75rem 1.4rem' }}>
            <span>View Methodology</span>
          </Link>
          <Link href="/developers" className="btn btn-secondary" style={{ padding: '0.75rem 1.4rem' }}>
            <Code size={15} />
            <span>Read-Only API</span>
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
          <span>✓ Live BSC Probing</span>
          <span>•</span>
          <span>✓ Deterministic Math</span>
          <span>•</span>
          <span>✓ Zero ML Hallucinations</span>
          <span>•</span>
          <span>✓ $0 Developer API</span>
        </div>
      </section>

      {/* 2. Genuine Live Network Telemetry */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Live Network Telemetry
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Real-time measurement metrics directly backed by Neon PostgreSQL observations on BNB Chain.
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
            <span>Active Probing</span>
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
            label="Monitored AI Agents"
            value={totalAgents}
            subvalue="ERC-8004 on BNB Chain"
            description="Active autonomous agents discovered from the BNB Chain onchain registry."
            icon={Shield}
            accent="var(--accent-bnb)"
            tooltip="Count of distinct agents stored with onchain registry IDs."
          />
          <MetricCard
            label="Health Checks Run"
            value={totalObservations.toLocaleString()}
            subvalue="Continuous Live Pings"
            description="SSRF-hardened reachability, speed, and protocol tests recorded to Postgres."
            icon={Database}
            accent="var(--status-strong)"
            tooltip="Total individual reachability, latency, and protocol observations recorded."
          />
          <MetricCard
            label="Active Bot Endpoints"
            value={totalServices}
            subvalue="APIs, RPCs & Tools"
            description="Declared HTTP, agent-to-agent, and model capability endpoints."
            icon={Server}
            accent="var(--status-limited)"
            tooltip="Active service declarations extracted from agent metadata."
          />
          <MetricCard
            label="Latest Health Check"
            value={latestRun?.finishedAt ? <TimeAgo timestamp={latestRun.finishedAt} /> : 'Active'}
            subvalue={latestRun?.finishedAt ? `Completed at ${new Date(latestRun.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC` : 'Hourly Cycle'}
            description={`Tested ${latestRun?.targetAgentCount ?? totalAgents} agents via automated cloud runners.`}
            icon={Zap}
            accent="var(--status-moderate)"
            tooltip="Timestamp of the most recent autonomous cloud probe cycle."
          />
        </div>
      </section>

      {/* 3. The Problem & Solution Story */}
      <section style={{ marginBottom: '4rem' }}>
        <div className="card" style={{ padding: '2.5rem 2rem', background: 'var(--bg-surface-1)' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              How AgentProof Verifies Autonomous AI Agents
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              A bot being registered onchain doesn't mean it's online. AgentProof connects to its declared servers and measures whether it actually works.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.5rem',
              position: 'relative',
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
                Bot Registers
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                A creator registers an AI agent on BNB Chain's public registry (ERC-8004) with its wallet ownership and metadata.
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
                Links & APIs Shared
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                The bot advertises its public web addresses, APIs, RPCs, or agent-to-agent tools where other apps can contact it.
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
                03 • AUTOMATED TESTING
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Continuous Health Checks
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                AgentProof runs secure cloud pings every hour — testing if the bot responds, measuring millisecond speed, and checking errors.
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
                04 • LIVE REPORT CARD
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Reliability Passport
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                All test results are permanently saved into an open report card with 24h/7d uptime percentages and review authenticity signals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Live Activity Stream */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Live Health Check Activity
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Real-time feed of recent test pings conducted on BNB Chain agents.
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

      {/* 5. Core Architectural Pillars */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            Engineered for Trust &amp; Composability
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
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Deterministic Math</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Zero AI or LLM scoring. Reliability metrics are calculated with reproducible mathematical formulas over explicit 24h, 7d, and 30d observation windows.
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
              Designed for automated routing and orchestrators like AgentFlow. Read endpoints require no API key and provide JSON responses with explicit provenance.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
