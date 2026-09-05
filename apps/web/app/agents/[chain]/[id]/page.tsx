import { agentRepository, observationRepository, reputationRepository } from '@/lib/api/repositories';
import { computeAllWindows } from '@agentproof/reliability';
import { computeReputationEvidence } from '@agentproof/reputation';
import { PageShell, EmptyState } from '@/components/PageShell';
import { SafeExternalLink } from '@/components/SafeExternalLink';
import { CopyButton } from '@/components/CopyButton';
import {
  SufficiencyBadge,
  OutcomeBadge,
  ProtocolBadge,
  ProvenanceBadge,
  MonitoringStatusBadge,
  MetadataStatusBadge,
} from '@/components/Badges';
import { ReliabilityTimeline } from '@/components/ReliabilityTimeline';
import { UptimeHistoryGraph } from '@/components/UptimeHistoryGraph';
import type { ChainId, ReliabilityWindow } from '@agentproof/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
  Info,
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
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {window.window.toUpperCase()} Window
          </span>
          <Link href="/methodology#evidence-coverage" title="How evidence sufficiency is classified">
            <SufficiencyBadge tier={window.dataSufficiency} />
          </Link>
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
              <Link href="/methodology#measured-availability" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>
                Measured Availability
              </Link>
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
                <span style={{ color: 'var(--text-muted)' }}>Attributable Probes:</span>
                <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {window.successCount} / {window.observationCount} passed
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Attributable Failures:</span>
                <span className="font-mono" style={{ color: window.failureCount > 0 ? 'var(--status-failure)' : 'var(--text-secondary)' }}>
                  {window.failureCount}
                </span>
              </div>
              {window.medianLatencyMs !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Median Latency:</span>
                  <span className="font-mono">{window.medianLatencyMs}ms</span>
                </div>
              )}
              {window.p95LatencyMs !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>P95 Peak Latency:</span>
                  <span className="font-mono">{window.p95LatencyMs}ms</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '1rem 0' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Early sample ({window.observationCount} attributable probe{window.observationCount === 1 ? '' : 's'}).
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Requires at least 3 attributable service probes to publish an empirical availability ratio.
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
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Methodology v{window.methodologyVersion}</span>
        <Link href="/methodology#measured-availability" style={{ color: 'var(--accent-bnb)', textDecoration: 'underline' }}>
          Formula
        </Link>
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
  if (chain !== 'bsc') {
    notFound();
  }
  const decodedId = decodeURIComponent(id);
  const agent = await agentRepository.getAgent(chain as ChainId, decodedId);

  if (!agent) {
    notFound();
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
    limit: 500,
  });

  const windows = computeAllWindows({ agentId: agent.id, observations: observationsPage.items, now });
  const reputation = computeReputationEvidence({ agentId: agent.id, feedback, now });

  const isActivelyMonitored = observationsPage.items.length > 0;

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span
                className="badge font-mono"
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
              <MonitoringStatusBadge isMonitored={isActivelyMonitored} />
              <MetadataStatusBadge resolved={metadata?.metadataResolved ?? false} />
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
              Reliability Passport
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.2rem' }}>
              {isActivelyMonitored ? (
                <>
                  <span className="live-pulse" />
                  <strong style={{ color: 'var(--status-success)', fontSize: '0.95rem' }}>
                    AUTONOMOUS MONITORING
                  </strong>
                </>
              ) : (
                <strong style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  INDEXED (STANDBY)
                </strong>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
              {observationsPage.items.length} retained observations
            </div>
          </div>
        </div>

        {metadata?.description && (
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {metadata.description}
            </p>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
              Agent-provided metadata (not independently verified by AgentProof)
            </div>
          </div>
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
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Empirical Service Availability (24h, 7d, 30d)
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Deterministic availability ratios computed strictly from attributable service probes.
            </p>
          </div>
          <Link href="/methodology#measured-availability" style={{ fontSize: '0.8rem', color: 'var(--accent-bnb)', textDecoration: 'underline' }}>
            Methodology &amp; Formulas →
          </Link>
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
          <strong>About Evidence Coverage:</strong> Sufficiency tiers (LIMITED, MODERATE, STRONG) describe the statistical depth of recorded empirical observations. It is not a safety or trust rating.
        </div>
      </section>

      {/* 3. Probe Observation Timeline */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Scheduled Cycle Telemetry &amp; Latency
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Audit trail of automated probe runs tracking service response speeds in milliseconds.
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
            Public links, APIs, and agent-to-agent protocols advertised in this agent&apos;s ERC-8004 registry record.
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
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Onchain Reputation Evidence &amp; Reviewer Distribution
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Analysis of onchain feedback records indexed from ERC-8004 registries to evaluate reviewer diversity and concentration patterns.
            </p>
          </div>
          <Link href="/methodology#reputation-integrity" style={{ fontSize: '0.8rem', color: 'var(--accent-bnb)', textDecoration: 'underline' }}>
            Reputation Methodology →
          </Link>
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
                    Feedback Records
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
                    Evidence Coverage
                  </div>
                  <div style={{ marginTop: '0.4rem' }}>
                    <SufficiencyBadge tier={reputation.dataSufficiency} />
                  </div>
                </div>
              </div>

              {/* Signals */}
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  Observed Reputation Signals ({reputation.integritySignals.length})
                </h3>

                {reputation.integritySignals.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    No extreme reviewer concentration or burst patterns observed in indexed records.
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
              No onchain feedback records indexed for this agent yet.
            </div>
          )}
        </div>
      </section>

      {/* 6. Forensic Observation Ledger */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Forensic Observation Ledger
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Complete, timestamped audit trail of every automated probe recorded for this agent.
          </p>
        </div>

        {observationsPage.items.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No probe observations recorded for this agent in the last 30 days.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Probe Type</th>
                  <th>Result</th>
                  <th>Latency</th>
                  <th>HTTP Status</th>
                  <th>Methodology</th>
                </tr>
              </thead>
              <tbody>
                {observationsPage.items.slice(0, 30).map((obs) => (
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
