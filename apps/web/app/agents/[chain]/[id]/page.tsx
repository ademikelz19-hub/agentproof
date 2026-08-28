import { agentRepository, observationRepository, reputationRepository } from '@/lib/api/repositories';
import { computeAllWindows } from '@agentproof/reliability';
import { computeReputationEvidence } from '@agentproof/reputation';
import { PageShell, EmptyState } from '@/components/PageShell';
import { SafeExternalLink } from '@/components/SafeExternalLink';
import type { ChainId, ReliabilityWindow } from '@agentproof/core';

export const dynamic = 'force-dynamic';

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginTop: '2.5rem' }}>
      <h2 style={{ fontSize: '1.1rem', borderBottom: '1px solid #e5e5e5', paddingBottom: '0.4rem' }}>{title}</h2>
      <div style={{ marginTop: '1rem' }}>{children}</div>
    </section>
  );
}

function WindowCard({ window }: { window: ReliabilityWindow }) {
  return (
    <div style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: '1rem', minWidth: 180 }}>
      <div style={{ fontWeight: 600 }}>{window.window}</div>
      <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>
        Evidence: {window.dataSufficiency}
      </div>
      {window.sufficientData ? (
        <>
          <div>{window.availabilityPct?.toFixed(1)}% availability</div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>
            {window.observationCount} observations · {window.consecutiveFailures} consecutive failures
          </div>
          {window.medianLatencyMs !== undefined && (
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
              {window.medianLatencyMs}ms median · {window.p95LatencyMs}ms p95
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: '0.85rem', color: '#888' }}>
          Not enough evidence yet ({window.observationCount} observation
          {window.observationCount === 1 ? '' : 's'}).
        </div>
      )}
    </div>
  );
}

export default async function AgentPassportPage({
  params,
}: {
  params: Promise<{ chain: string; id: string }>;
}) {
  const { chain, id } = await params;
  const agent = await agentRepository.getAgent(chain as ChainId, id);

  if (!agent) {
    return (
      <PageShell>
        <EmptyState
          title="No evidence for this agent yet"
          body={`AgentProof has no measurement history for ${id} on ${chain}. Once live BSC monitoring is activated, agents discovered via ERC-8004 will appear here with independently measured reliability evidence.`}
        />
      </PageShell>
    );
  }

  const [metadata, services, feedback] = await Promise.all([
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
    limit: 50,
  });

  const windows = computeAllWindows({ agentId: agent.id, observations: observationsPage.items, now });
  const reputation = computeReputationEvidence({ agentId: agent.id, feedback, now });

  return (
    <PageShell>
      <Section title="Identity">
        <div>
          <strong>{metadata?.name ?? agent.id}</strong>
        </div>
        <div style={{ color: '#666', fontSize: '0.9rem' }}>
          {agent.chain} · onchain id {agent.onchainId}
        </div>
        {metadata?.description && <p style={{ color: '#444' }}>{metadata.description}</p>}
      </Section>

      <Section title="Advertised Services">
        {metadata?.metadataResolved === false || metadata === null ? (
          <EmptyState
            title="Metadata not yet resolved"
            body="AgentProof has not resolved this agent's metadata document yet, so it cannot yet say what services (if any) are declared. This is different from the agent having declared zero services."
          />
        ) : services.length === 0 ? (
          <EmptyState
            title="No services declared"
            body="AgentProof resolved this agent's metadata and it declares no services."
          />
        ) : (
          <ul style={{ paddingLeft: '1.2rem' }}>
            {services.map((svc) => (
              <li key={svc.id} style={{ marginBottom: '0.4rem' }}>
                <SafeExternalLink url={svc.url} /> <span style={{ color: '#888' }}>({svc.protocol})</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Reliability &amp; Evidence Coverage" id="reliability">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {Object.values(windows).map((w) => (
            <WindowCard key={w.window} window={w} />
          ))}
        </div>
      </Section>

      <Section title="Current Observations">
        {observationsPage.items.length === 0 ? (
          <EmptyState title="No observations yet" body="No probes have been recorded for this agent in the last 30 days." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e5e5' }}>
                <th>Timestamp</th>
                <th>Probe</th>
                <th>Result</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {observationsPage.items.map((obs) => (
                <tr key={obs.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td>{obs.timestamp}</td>
                  <td>{obs.probeType}</td>
                  <td>{obs.outcome}</td>
                  <td>{obs.latencyMs !== undefined ? `${obs.latencyMs}ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Reputation Evidence &amp; Integrity Signals" id="reputation-integrity">
        {reputation.feedbackAvailability === 'NOT_INGESTED' && (
          <EmptyState
            title="Feedback evidence has not yet been ingested"
            body="AgentProof has not yet built or run a feedback-ingestion pipeline for this agent. This is different from having checked and found no feedback — see the Methodology page."
          />
        )}
        {reputation.feedbackAvailability === 'UPSTREAM_UNAVAILABLE' && (
          <EmptyState
            title="Feedback evidence temporarily unavailable"
            body="The upstream feedback source could not be reached. This is not the same as the agent having no feedback."
          />
        )}
        {reputation.feedbackAvailability === 'UNSUPPORTED' && (
          <EmptyState
            title="Feedback evidence not supported for this agent"
            body="AgentProof does not currently support feedback analysis for this agent or chain."
          />
        )}
        {reputation.feedbackAvailability === 'AVAILABLE' && (
          <>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
              Evidence: {reputation.dataSufficiency}
            </div>
            {reputation.dataSufficiency === 'INSUFFICIENT' ? (
              <EmptyState
                title="No feedback observed"
                body={`AgentProof checked and found ${reputation.feedbackCount} feedback record${reputation.feedbackCount === 1 ? '' : 's'} — at least 5 are required before computing reputation-integrity signals.`}
              />
            ) : (
              <>
                <div>
                  {reputation.feedbackCount} feedback records from {reputation.uniqueReviewerCount} unique
                  reviewers
                </div>
                {reputation.integritySignals.length === 0 ? (
                  <p style={{ color: '#666' }}>No integrity signals detected.</p>
                ) : (
                  <ul style={{ paddingLeft: '1.2rem' }}>
                    {reputation.integritySignals.map((s) => (
                      <li key={s.id}>{s.description}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </Section>

      <Section title="Provenance &amp; Methodology">
        <div style={{ fontSize: '0.85rem', color: '#666' }}>
          Identity source: {agent.provenance.source} ({agent.provenance.origin}), observed{' '}
          {agent.provenance.observedAt}.
        </div>
        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.4rem' }}>
          Reliability methodology v{windows['24h'].methodologyVersion} · Reputation methodology v
          {reputation.methodologyVersion} — see <a href="/methodology">Methodology</a> for the full
          definitions.
        </div>
      </Section>
    </PageShell>
  );
}
