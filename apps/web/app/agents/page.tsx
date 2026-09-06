import { PageShell } from '@/components/PageShell';
import { AgentExplorerTable, type AgentListItem } from '@/components/AgentExplorerTable';
import { db } from '@agentproof/db';
import { sql } from 'drizzle-orm';
import { Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const maxDuration = 25;

export default async function AgentsPage() {
  let agentItems: AgentListItem[] = [];
  let fetchError: string | null = null;
  let totalAgentCount: number | undefined;

  try {
    // Run total count and main query in parallel — count is a cheap seq scan
    const [countResult, rows] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS total FROM agents`),
      db.execute(sql`
      SELECT
        a.id,
        a.chain,
        a.onchain_id       AS "onchainId",
        a.registry_address AS "registryAddress",
        a.name,
        a.description,
        a.metadata_resolved AS "metadataResolved",
        a.provenance_source AS "provenanceSource",
        a.provenance_origin AS "provenanceOrigin",
        a.last_ingested_at  AS "lastIngestedAt",
        COALESCE(
          (SELECT json_agg(json_build_object('id', s.id, 'protocol', s.protocol, 'url', s.url))
           FROM services s WHERE s.agent_id = a.id),
          '[]'
        ) AS services,
        COALESCE(os.total_count, 0)::int   AS "totalCount",
        COALESCE(os.success_count, 0)::int AS "successCount",
        os.latest_outcome                   AS "latestOutcome",
        os.latest_latency                   AS "latestLatencyMs"
      FROM agents a
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int                                                     AS total_count,
          COUNT(*) FILTER (WHERE outcome = 'SUCCESS')::int                  AS success_count,
          (ARRAY_AGG(outcome    ORDER BY timestamp DESC))[1]                AS latest_outcome,
          (ARRAY_AGG(latency_ms ORDER BY timestamp DESC NULLS LAST)
             FILTER (WHERE latency_ms IS NOT NULL))[1]                      AS latest_latency
        FROM observations o
        WHERE o.agent_id = a.id
      ) os ON true
      ORDER BY a.last_ingested_at DESC
    `),
    ]);

    totalAgentCount = Number((countResult.rows[0] as Record<string, unknown>)?.total ?? 0);

    agentItems = (rows.rows as Record<string, unknown>[]).map((row) => {
      const totalCount = Number(row.totalCount ?? 0);
      const successCount = Number(row.successCount ?? 0);
      const availPct = totalCount > 0 ? (successCount / totalCount) * 100 : null;
      return {
        id: String(row.id),
        chain: String(row.chain) as 'bsc',
        onchainId: String(row.onchainId),
        registryAddress: row.registryAddress ? String(row.registryAddress) : undefined,
        name: row.name ? String(row.name) : undefined,
        description: row.description ? String(row.description) : undefined,
        metadataResolved: Boolean(row.metadataResolved),
        services: (Array.isArray(row.services) ? row.services : []) as { id: string; protocol: string; url: string }[],
        isMonitored: totalCount > 0,
        observationCount: totalCount,
        availabilityPct: availPct,
        latestOutcome: row.latestOutcome ? String(row.latestOutcome) : undefined,
        latestLatencyMs: row.latestLatencyMs ? Number(row.latestLatencyMs) : undefined,
        provenance: {
          source: String(row.provenanceSource) as 'INDEXER',
          origin: String(row.provenanceOrigin),
          observedAt: row.lastIngestedAt
            ? new Date(String(row.lastIngestedAt)).toISOString()
            : new Date().toISOString(),
        },
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AgentsPage] DB query failed:', message);
    fetchError = message;
  }

  return (
    <PageShell>
      <div style={{ marginBottom: '2rem' }}>
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
          <Activity size={12} />
          <span>DIRECTORY • BNB CHAIN ({totalAgentCount ?? agentItems.length})</span>
        </div>
        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '0.5rem',
            color: 'var(--text-primary)',
          }}
        >
          Autonomous Agents Directory
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: 720, lineHeight: 1.6 }}>
          Directory of ERC-8004 agents discovered from the BNB Chain registry. Quick reachability, uptime percentage,
          and response latency are shown directly for monitored agents.
        </p>
      </div>
      {fetchError && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: '#2a1010',
            border: '1px solid #7f1d1d',
            borderRadius: 6,
            color: '#f87171',
            fontSize: '0.825rem',
            fontFamily: 'var(--font-mono)',
            marginBottom: '1.5rem',
          }}
        >
          ⚠ Directory temporarily unavailable: {fetchError}
        </div>
      )}
      <AgentExplorerTable agents={agentItems} totalCount={totalAgentCount} />
    </PageShell>
  );
}
