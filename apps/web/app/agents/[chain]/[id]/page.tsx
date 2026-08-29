import { agentRepository, observationRepository, reputationRepository } from '@/lib/api/repositories';
import { computeAllWindows } from '@agentproof/reliability';
import { computeReputationEvidence } from '@agentproof/reputation';
import { PageShell, EmptyState } from '@/components/PageShell';
import { SafeExternalLink } from '@/components/SafeExternalLink';
import { CopyButton } from '@/components/CopyButton';
import { SufficiencyBadge, OutcomeBadge, ProtocolBadge, ProvenanceBadge } from '@/components/Badges';
import { ReliabilityTimeline } from '@/components/ReliabilityTimeline';
import { UptimeHistoryGraph } from '@/components/UptimeHistoryGraph';
import type { ChainId, ReliabilityWindow } from '@agentproof/core';
import Link from 'next/link';
import {
  Shield,
  Activity,
  Layers,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Database,
  ArrowLeft,
  Server,
  FileCheck,
  Zap,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function WindowCard({ window }: { window: ReliabilityWindow }) {
  const isSufficient = window.sufficientData && (window.observationCount ?? 0) > 0;
  const avail = window.availabilityPct ?? 0;

  return (
    <div
      className="card"
      style={{
        flex: '1 1 200px',
        padding: '1.25rem',
        background: 'var(--bg-surface-1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {window.window.toUpperCase()} Uptime
          </span>
          <SufficiencyBadge tier={window.dataSufficiency} />
        </div>

        {isSufficient ? (
          <div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: avail >= 90 ? 'var(--status-success)' : avail >= 70 ? 'var(--status-warning)' : 'var(--status-failure)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              {avail.toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              Uptime Score
            </div>

            <div
              style={{
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Tests:</span>
                <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {window.observationCount}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Passed / Failed:</span>
                <span className="font-mono">
                  {window.successCount} / {window.failureCount}
                </span>
              </div>
              {window.medianLatencyMs !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Typical Speed:</span>
                  <span className="font-mono">{window.medianLatencyMs}ms</span>
                </div>
              )}
              {window.p95LatencyMs !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Peak Latency (P95):</span>
                  <span className="font-mono">{window.p95LatencyMs}ms</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '1rem 0' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Early test history ({window.observationCount} check{window.observationCount === 1 ? '' : 's'}).
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Requires at least 3 test pings to compute meaningful uptime.
            </p>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: '1rem',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Methodology v{window.methodologyVersion}
      </div>
    </div>
  );
}

export default async function AgentPassportPage({
  params,
}: {
  params: Promise<{ chain: string; id: string }>;
}) {
  const { chain, id } = await params;
  const decodedId = decodeURIComponent(id);
  const agent = await agentRepository.getAgent(chain as ChainId, decodedId);

  if (!agent) {
    return (
      <PageShell>
        <div style={{ padding: '2rem 0' }}>
          <Link
            href="/agents"
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: '1.5rem', display: 'inline-flex' }}
          >
            <ArrowLeft size={13} />
            <span>Back to Explorer</span>
          </Link>
          <EmptyState
            title="No measurement evidence found for this agent"
            body={`AgentProof has no record for ${id} on ${chain}. The agent may not be indexed from ERC-8004 yet or has not advertised verifiable services.`}
            action={
              <Link href="/agents" className="btn btn-primary btn-sm">
                Browse Monitored Agents
              </Link>
            }
          />
        </div>
      </PageShell>
    );
  }

  const [metadata, servicesList, feedback] = await Promise.all([
    agentRepository.getMetadata(agent.id),
    agentRepository.getServices(agent.id),
    reputationRepository.listFeedback(agent.id),
  ]);

  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const observationsPage = await observationRepository.listObservations({
    agentId: agent.id,
    since,
    until: now.toISOString(),
    limit: 100,
  });

  const windows = computeAllWindows({ agentId: agent.id, observations: observationsPage.items, now });
  const reputation = computeReputationEvidence({ agentId: agent.id, feedback, now });

  return (
    <PageShell>
      {/* Back Button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/agents"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Agents Directory</span>
        </Link>
      </div>

      {/* 1. Header Passport Card */}
      <section className="card" style={{ padding: '2rem', marginBottom: '2rem', background: 'var(--bg-surface-1)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span
                className="badge"
                style={{
                  background: 'var(--accent-bnb-subtle)',
                  color: 'var(--accent-bnb)',
                  border: '1px solid var(--accent-bnb-border)',
                }}
              >
                BNB CHAIN (56)
              </span>
              <span
                className="badge font-mono"
                style={{
                  background: 'var(--bg-surface-2)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                TOKEN #{agent.onchainId}
              </span>
              <ProvenanceBadge source={agent.provenance.source} origin={agent.provenance.origin} />
            </div>

            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '0.35rem',
              }}
            >
              {metadata?.name ?? agent.id}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {agent.id}
              </span>
              <CopyButton text={agent.id} label="Copy ID" />
              <CopyButton
                text={`https://agentproof-rho.vercel.app/api/v1/agents/${agent.chain}/${agent.id}/reliability`}
                label="API URL"
              />
            </div>
          </div>

          <div
            style={{
              padding: '0.75rem 1.25rem',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Monitoring Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.2rem' }}>
              <span className="live-pulse" />
              <strong style={{ color: 'var(--status-success)', fontSize: '0.95rem' }}>
                ONLINE MONITORING
              </strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
              {observationsPage.items.length} health checks logged
            </div>
          </div>
        </div>

        {metadata?.description && (
          <p
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
            }}
          >
            {metadata.description}
          </p>
        )}

        {/* Metadata Details strip */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.85rem 1rem',
            background: 'var(--bg-surface-2)',
            borderRadius: 6,
            fontSize: '0.8rem',
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>BNB Registry: </span>
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
              {agent.registryAddress ?? '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432'}
            </span>
          </div>
          {metadata?.metadataUri && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Metadata Link: </span>
              <SafeExternalLink url={metadata.metadataUri} />
            </div>
          )}
          <div>
            <span style={{ color: 'var(--text-muted)' }}>First Tracked: </span>
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
              {agent.provenance?.observedAt && !isNaN(new Date(agent.provenance.observedAt).getTime())
                ? new Date(agent.provenance.observedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                : 'Continuous'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Reliability Windows (24h, 7d, 30d) */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Uptime &amp; Response Speed
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Measured directly by automated cloud tests checking if the bot responds and how fast it answers.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          {Object.values(windows).map((w) => (
            <WindowCard key={w.window} window={w} />
          ))}
        </div>

        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.65rem 0.85rem',
            background: 'var(--bg-surface-2)',
            borderRadius: 6,
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          <strong>About Sample Sizes:</strong> Badges (EARLY SAMPLE, MODERATE SAMPLE, VERIFIED SAMPLE) reflect how many test cycles have been recorded over time.
        </div>
      </section>

      {/* 3. Probe Observation Timeline */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Recent Ping History &amp; Speed
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            History of automated health checks showing response times in milliseconds.
          </p>
        </div>

        <UptimeHistoryGraph observations={observationsPage.items} />

        <ReliabilityTimeline
          observations={observationsPage.items}
          windowLabel="Observed Response Latency &amp; Status"
        />
      </section>

      {/* 4. Declared Services & Endpoints */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Declared Endpoints &amp; Tools ({servicesList.length})
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Public links, APIs, and agent-to-agent tools advertised by this bot.
          </p>
        </div>

        {servicesList.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No external services or endpoints declared in this agent&apos;s metadata.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service ID</th>
                  <th>Protocol</th>
                  <th>Endpoint URL</th>
                  <th>Form</th>
                  <th>Provenance</th>
                </tr>
              </thead>
              <tbody>
                {servicesList.map((svc) => (
                  <tr key={svc.id}>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 600 }}>
                        {svc.id}
                      </span>
                    </td>
                    <td>
                      <ProtocolBadge protocol={svc.protocol} />
                    </td>
                    <td>
                      <SafeExternalLink url={svc.url} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {svc.declarationForm}
                      </span>
                    </td>
                    <td>
                      <ProvenanceBadge source={svc.provenance.source} origin={svc.provenance.origin} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Reputation Evidence */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            User Reviews &amp; Authenticity
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Independent check on 8004scan user reviews to verify feedback comes from distinct real wallets rather than a single owner.
          </p>
        </div>

        <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-surface-1)' }}>
          {reputation.feedbackAvailability === 'AVAILABLE' ? (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Total Reviews
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {reputation.feedbackCount}
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Unique Reviewers
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {reputation.uniqueReviewerCount}
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Reviewer Diversity
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {reputation.feedbackCount > 0
                      ? `${((reputation.uniqueReviewerCount / reputation.feedbackCount) * 100).toFixed(1)}%`
                      : 'N/A'}
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-surface-2)', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Review Sample Size
                  </div>
                  <div style={{ marginTop: '0.4rem' }}>
                    <SufficiencyBadge tier={reputation.dataSufficiency} />
                  </div>
                </div>
              </div>

              {/* Signals */}
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  Detected Review Signals ({reputation.integritySignals.length})
                </h3>

                {reputation.integritySignals.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    No suspicious reviewer concentration or self-review patterns detected.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {reputation.integritySignals.map((signal) => (
                      <div
                        key={signal.id}
                        style={{
                          padding: '0.75rem 1rem',
                          background: 'var(--status-warning-bg)',
                          border: '1px solid var(--status-warning-border)',
                          borderRadius: 6,
                          fontSize: '0.85rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--status-warning)', marginBottom: '0.2rem' }}>
                          <AlertTriangle size={14} />
                          <span>{signal.signalType.replace(/_/g, ' ')}</span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: 1.5 }}>
                          {signal.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
              No onchain user reviews submitted for this bot yet.
            </div>
          )}
        </div>
      </section>

      {/* 6. Observation History Ledger Table */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Detailed Health Check Log
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Complete audit trail of every automated test ping recorded for this bot.
          </p>
        </div>

        {observationsPage.items.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No health checks recorded for this agent in the last 30 days.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time Tested</th>
                  <th>Test Type</th>
                  <th>Result</th>
                  <th>Speed</th>
                  <th>HTTP Status</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {observationsPage.items.slice(0, 20).map((obs) => (
                  <tr key={obs.id}>
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(obs.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {obs.probeType}
                      </span>
                    </td>
                    <td>
                      <OutcomeBadge outcome={obs.outcome} />
                    </td>
                    <td>
                      {obs.latencyMs !== undefined && obs.latencyMs !== null ? (
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
                      <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        v{obs.methodologyVersion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
