'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowUpRight, ChevronLeft, ChevronRight, ChevronDown, Layers, List } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { ProtocolBadge, ProvenanceBadge, MonitoringStatusBadge, MetadataStatusBadge } from './Badges';
import type { AgentIdentity } from '@agentproof/core';

export interface AgentListItem extends AgentIdentity {
  name?: string | null;
  description?: string | null;
  metadataResolved?: boolean;
  serviceCount?: number;
  services?: { id: string; protocol: string; url: string }[];
  lastIngestedAt?: string | Date;
  isMonitored?: boolean;
  observationCount?: number;
  availabilityPct?: number | null;
  latestOutcome?: string;
  latestLatencyMs?: number;
}

type FilterMode = 'ALL' | 'WITH_SERVICES' | 'MONITORED' | 'RESOLVED';
type ViewMode = 'GROUPED' | 'FLAT';

/**
 * A cluster of on-chain tokens that share the same template identity.
 * Batch minters (e.g. Ave.ai) register hundreds of ERC-8004 tokens with an
 * identical name + description; showing each token as its own row floods the
 * directory, so we collapse them into one cluster with aggregated evidence.
 */
interface AgentCluster {
  key: string;
  representative: AgentListItem;
  members: AgentListItem[];
  /** Position of the most recently ingested member — preserves newest-first ordering. */
  firstIndex: number;
  withEndpoints: number;
  monitored: number;
  online: number;
  avgAvailability: number | null;
  minTokenId: string;
  maxTokenId: string;
}

const PAGE_SIZE = 25;
const MEMBER_PREVIEW = 20;

function clusterKey(agent: AgentListItem): string {
  const name = (agent.name ?? '').trim().toLowerCase();
  if (!name) return `id:${agent.id}`; // unnamed agents are never merged
  const desc = (agent.description ?? '').trim().toLowerCase();
  return `${name}|${desc}`;
}

function hasEndpoints(a: AgentListItem): boolean {
  return (a.serviceCount ?? 0) > 0 || (a.services?.length ?? 0) > 0;
}

function isMonitored(a: AgentListItem): boolean {
  return a.isMonitored === true || (a.observationCount ?? 0) > 0;
}

/** Best representative first: real endpoints → higher uptime → more evidence → newest token. */
function compareRepresentative(a: AgentListItem, b: AgentListItem): number {
  const ep = Number(hasEndpoints(b)) - Number(hasEndpoints(a));
  if (ep !== 0) return ep;
  const av = (b.availabilityPct ?? -1) - (a.availabilityPct ?? -1);
  if (av !== 0) return av;
  const obs = (b.observationCount ?? 0) - (a.observationCount ?? 0);
  if (obs !== 0) return obs;
  return Number(b.onchainId) - Number(a.onchainId);
}

function availabilityColor(avail: number): string {
  return avail >= 90 ? 'var(--status-success)' : avail >= 70 ? 'var(--status-warning)' : 'var(--status-failure)';
}

const batchPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  fontSize: '0.68rem',
  padding: '0.1rem 0.4rem',
  borderRadius: 4,
  background: 'rgba(240, 185, 11, 0.1)',
  border: '1px solid rgba(240, 185, 11, 0.3)',
  color: 'var(--accent-bnb)',
  fontFamily: 'var(--font-mono)',
  cursor: 'pointer',
};

export function AgentExplorerTable({ agents, totalCount }: { agents: AgentListItem[]; totalCount?: number }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('GROUPED');
  const [currentPage, setCurrentPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, number>>({});

  // 1. Filter individual tokens first so cluster stats reflect the active filter.
  const filteredAgents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return agents.filter((agent) => {
      if (q) {
        const matches =
          agent.id.toLowerCase().includes(q) ||
          agent.onchainId.toLowerCase().includes(q.replace(/^#/, '')) ||
          (agent.name?.toLowerCase().includes(q) ?? false) ||
          (agent.description?.toLowerCase().includes(q) ?? false);
        if (!matches) return false;
      }
      if (filterMode === 'MONITORED') return isMonitored(agent);
      if (filterMode === 'WITH_SERVICES') return hasEndpoints(agent);
      if (filterMode === 'RESOLVED') return agent.metadataResolved === true;
      return true;
    });
  }, [agents, searchTerm, filterMode]);

  // 2. Collapse batch-minted templates into clusters.
  const clusters = useMemo<AgentCluster[]>(() => {
    const map = new Map<string, { members: AgentListItem[]; firstIndex: number }>();
    filteredAgents.forEach((agent, index) => {
      const key = clusterKey(agent);
      const entry = map.get(key);
      if (entry) entry.members.push(agent);
      else map.set(key, { members: [agent], firstIndex: index });
    });

    return Array.from(map.entries())
      .map(([key, { members, firstIndex }]) => {
        const sorted = [...members].sort(compareRepresentative);
        const monitoredMembers = sorted.filter((m) => m.availabilityPct !== null && m.availabilityPct !== undefined);
        const tokenIds = sorted.map((m) => Number(m.onchainId)).filter((n) => Number.isFinite(n));
        return {
          key,
          representative: sorted[0]!,
          members: sorted,
          firstIndex,
          withEndpoints: sorted.filter(hasEndpoints).length,
          monitored: sorted.filter(isMonitored).length,
          online: sorted.filter((m) => m.latestOutcome === 'SUCCESS').length,
          avgAvailability:
            monitoredMembers.length > 0
              ? monitoredMembers.reduce((sum, m) => sum + (m.availabilityPct ?? 0), 0) / monitoredMembers.length
              : null,
          minTokenId: tokenIds.length ? String(Math.min(...tokenIds)) : sorted[0]!.onchainId,
          maxTokenId: tokenIds.length ? String(Math.max(...tokenIds)) : sorted[0]!.onchainId,
        };
      })
      .sort((a, b) => a.firstIndex - b.firstIndex);
  }, [filteredAgents]);

  const batchTemplateCount = useMemo(() => clusters.filter((c) => c.members.length > 1).length, [clusters]);
  const batchTokenCount = useMemo(
    () => clusters.reduce((sum, c) => sum + (c.members.length > 1 ? c.members.length : 0), 0),
    [clusters],
  );

  const rowCount = viewMode === 'GROUPED' ? clusters.length : filteredAgents.length;
  const totalPages = Math.max(1, Math.ceil(rowCount / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);
  const pageStart = (activePage - 1) * PAGE_SIZE;

  const pageClusters = useMemo(
    () => (viewMode === 'GROUPED' ? clusters.slice(pageStart, pageStart + PAGE_SIZE) : []),
    [clusters, viewMode, pageStart],
  );
  const pageAgents = useMemo(
    () => (viewMode === 'FLAT' ? filteredAgents.slice(pageStart, pageStart + PAGE_SIZE) : []),
    [filteredAgents, viewMode, pageStart],
  );

  // Template size lookup for the flat view's batch pill.
  const templateSize = useMemo(() => {
    const sizes: Record<string, number> = {};
    for (const a of agents) {
      const k = clusterKey(a);
      sizes[k] = (sizes[k] ?? 0) + 1;
    }
    return sizes;
  }, [agents]);

  const monitoredCount = useMemo(() => agents.filter(isMonitored).length, [agents]);
  const endpointCount = useMemo(() => agents.filter(hasEndpoints).length, [agents]);

  const resetPage = () => setCurrentPage(1);
  const toggleCluster = (key: string) =>
    setExpanded((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = MEMBER_PREVIEW;
      return next;
    });
  const showMoreMembers = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: (prev[key] ?? MEMBER_PREVIEW) + 50 }));

  // ---------- Cell renderers (shared by flat rows, cluster heads, and cluster members) ----------

  const renderStatus = (agent: AgentListItem, cluster?: AgentCluster) => {
    if (cluster && cluster.members.length > 1) {
      if (cluster.avgAvailability === null) {
        return (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {cluster.withEndpoints === 0 ? 'NO ENDPOINTS DECLARED' : 'STANDBY (NO RUNS)'}
          </span>
        );
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.85rem', color: availabilityColor(cluster.avgAvailability) }}>
            {cluster.avgAvailability.toFixed(1)}% avg uptime
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {cluster.online}/{cluster.members.length} online · {cluster.withEndpoints} with endpoints
          </span>
        </div>
      );
    }

    const avail = agent.availabilityPct;
    if (avail !== undefined && avail !== null) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.85rem', color: availabilityColor(avail) }}>
            {avail === 0 ? '0.0% (OFFLINE)' : `${avail.toFixed(1)}% Uptime`}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {agent.latestLatencyMs
              ? `${agent.latestLatencyMs}ms latency · ${agent.observationCount} run${agent.observationCount === 1 ? '' : 's'}`
              : `${agent.observationCount} test${agent.observationCount === 1 ? '' : 's'} logged`}
          </span>
        </div>
      );
    }
    if (!hasEndpoints(agent)) {
      return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NO ENDPOINTS DECLARED</span>;
    }
    return <MonitoringStatusBadge isMonitored={isMonitored(agent)} />;
  };

  const renderEndpoints = (agent: AgentListItem) =>
    agent.services && agent.services.length > 0 ? (
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
        {agent.services.map((s) => (
          <ProtocolBadge key={s.id} protocol={s.protocol} />
        ))}
      </div>
    ) : (
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0 declared</span>
    );

  const renderPassport = (agent: AgentListItem) => (
    <Link href={`/agents/${agent.chain}/${agent.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.65rem' }}>
      <span>Passport</span>
      <ArrowUpRight size={12} />
    </Link>
  );

  const renderIdentity = (agent: AgentListItem, opts: { cluster?: AgentCluster; batchSize?: number; compact?: boolean }) => {
    const { cluster, batchSize = 1, compact } = opts;
    const isCluster = cluster !== undefined && cluster.members.length > 1;
    const isOpen = cluster ? Boolean(expanded[cluster.key]) : false;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: compact ? '1.25rem' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {!compact && (
            <Link href={`/agents/${agent.chain}/${agent.id}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              <span className="font-mono">{agent.name ?? agent.id}</span>
            </Link>
          )}
          <span className="font-mono" style={{ fontSize: compact ? '0.8rem' : '0.72rem', color: compact ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
            {isCluster ? `#${cluster.minTokenId}–#${cluster.maxTokenId}` : `#${agent.onchainId}`}
          </span>
          {isCluster && (
            <button
              type="button"
              onClick={() => toggleCluster(cluster.key)}
              style={batchPillStyle}
              title="Batch-minted template: these on-chain tokens share the same name and description"
            >
              <Layers size={11} />
              {cluster.members.length} tokens
              <ChevronDown size={11} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
          )}
          {!isCluster && batchSize > 1 && !compact && (
            <span style={{ ...batchPillStyle, cursor: 'default' }} title={`${batchSize} on-chain tokens share this template`}>
              <Layers size={11} />
              {batchSize}x batch
            </span>
          )}
        </div>
        {!compact && agent.description && (
          <span
            style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={agent.description}
          >
            {agent.description}
          </span>
        )}
      </div>
    );
  };

  const renderRow = (agent: AgentListItem, opts: { cluster?: AgentCluster; batchSize?: number; compact?: boolean; key: string }) => (
    <tr key={opts.key} style={opts.compact ? { background: 'var(--bg-surface-2)' } : undefined}>
      <td>{renderIdentity(agent, opts)}</td>
      <td>{renderStatus(agent, opts.compact ? undefined : opts.cluster)}</td>
      <td>{renderEndpoints(agent)}</td>
      <td>
        <MetadataStatusBadge resolved={agent.metadataResolved ?? false} />
      </td>
      <td>
        <ProvenanceBadge source={agent.provenance.source} origin={agent.provenance.origin} />
      </td>
      <td style={{ textAlign: 'right' }}>{renderPassport(agent)}</td>
    </tr>
  );

  const renderMemberRows = (cluster: AgentCluster) => {
    const limit = expanded[cluster.key];
    if (!limit) return null;
    const visible = cluster.members.slice(0, limit);
    const remaining = cluster.members.length - visible.length;
    return (
      <>
        {visible.map((m) => renderRow(m, { compact: true, key: `${cluster.key}::${m.id}` }))}
        {remaining > 0 && (
          <tr key={`${cluster.key}::more`} style={{ background: 'var(--bg-surface-2)' }}>
            <td colSpan={6} style={{ textAlign: 'center' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => showMoreMembers(cluster.key)}>
                Show {Math.min(50, remaining)} more of {remaining} remaining tokens
              </button>
            </td>
          </tr>
        )}
      </>
    );
  };

  const filterButton = (mode: FilterMode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setFilterMode(mode);
        resetPage();
      }}
      className={`btn btn-sm ${filterMode === mode ? 'btn-primary' : 'btn-secondary'}`}
    >
      {label}
    </button>
  );

  const viewButton = (mode: ViewMode, label: string, icon: React.ReactNode, title: string) => (
    <button
      type="button"
      title={title}
      onClick={() => {
        setViewMode(mode);
        resetPage();
      }}
      className={`btn btn-sm ${viewMode === mode ? 'btn-primary' : 'btn-secondary'}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div>
      {/* Search, View & Filter Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 480 }}>
            <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <Search size={15} />
            </div>
            <input
              type="text"
              placeholder="Search by Token ID (#2518), Name, or Keyword..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                resetPage();
              }}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.4rem',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-medium)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {viewButton('GROUPED', 'Grouped', <Layers size={13} />, 'Collapse batch-minted tokens that share a template into one row')}
            {viewButton('FLAT', 'All Tokens', <List size={13} />, 'Show every on-chain token as its own row')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {filterButton('ALL', `All Indexed (${totalCount ?? agents.length})`)}
          {filterButton('WITH_SERVICES', `Has Endpoints (${endpointCount})`)}
          {filterButton('MONITORED', `Actively Monitored (${monitoredCount})`)}
          {filterButton('RESOLVED', 'Metadata Resolved')}
        </div>
      </div>

      {/* Results summary */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>
          {viewMode === 'GROUPED' ? (
            <>
              {clusters.length.toLocaleString()} distinct agents from {filteredAgents.length.toLocaleString()} tokens
              {batchTemplateCount > 0 &&
                ` · ${batchTokenCount.toLocaleString()} batch-minted tokens collapsed into ${batchTemplateCount} templates`}
            </>
          ) : (
            <>
              Showing {rowCount === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, rowCount)} of {rowCount.toLocaleString()} tokens
            </>
          )}
        </span>
        <span>BNB Chain (56) • ERC-8004 Registry</span>
      </div>

      {rowCount === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>No agents match your filter criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterMode('ALL');
              resetPage();
            }}
            className="btn btn-secondary btn-sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-container desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent Name &amp; ID</th>
                  <th>Live Status / Availability</th>
                  <th>Declared Endpoints</th>
                  <th>Metadata</th>
                  <th>Provenance</th>
                  <th style={{ textAlign: 'right' }}>Passport</th>
                </tr>
              </thead>
              <tbody>
                {viewMode === 'GROUPED'
                  ? pageClusters.map((cluster) => (
                      <Fragment key={cluster.key}>
                        {renderRow(cluster.representative, { cluster, key: `head::${cluster.key}` })}
                        {renderMemberRows(cluster)}
                      </Fragment>
                    ))
                  : pageAgents.map((agent) =>
                      renderRow(agent, { batchSize: templateSize[clusterKey(agent)] ?? 1, key: agent.id }),
                    )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-only" style={{ flexDirection: 'column', gap: '0.75rem' }}>
            {(viewMode === 'GROUPED'
              ? pageClusters.map((c) => ({ agent: c.representative, cluster: c as AgentCluster | undefined }))
              : pageAgents.map((a) => ({ agent: a, cluster: undefined as AgentCluster | undefined }))
            ).map(({ agent, cluster }) => {
              const isCluster = cluster !== undefined && cluster.members.length > 1;
              const limit = cluster ? expanded[cluster.key] : undefined;
              return (
                <div key={cluster?.key ?? agent.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <Link href={`/agents/${agent.chain}/${agent.id}`} style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {agent.name ?? agent.id}
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {isCluster ? `#${cluster.minTokenId}–#${cluster.maxTokenId}` : `#${agent.onchainId}`}
                        </span>
                        {isCluster ? (
                          <button type="button" onClick={() => toggleCluster(cluster.key)} style={batchPillStyle}>
                            <Layers size={11} />
                            {cluster.members.length} tokens
                          </button>
                        ) : (
                          <CopyButton text={agent.id} label="ID" />
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>{renderStatus(agent, cluster)}</div>
                  </div>

                  {agent.description && (
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.4,
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {agent.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <MetadataStatusBadge resolved={agent.metadataResolved ?? false} />
                    {renderEndpoints(agent)}
                  </div>

                  {isCluster && limit && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {cluster.members.slice(0, limit).map((m) => (
                        <Link
                          key={m.id}
                          href={`/agents/${m.chain}/${m.id}`}
                          className="font-mono"
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.4rem',
                            borderRadius: 4,
                            border: '1px solid var(--border-subtle)',
                            color: m.latestOutcome === 'SUCCESS' ? 'var(--status-success)' : 'var(--text-secondary)',
                          }}
                        >
                          #{m.onchainId}
                        </Link>
                      ))}
                      {cluster.members.length > limit && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => showMoreMembers(cluster.key)}>
                          +{cluster.members.length - limit} more
                        </button>
                      )}
                    </div>
                  )}

                  <Link href={`/agents/${agent.chain}/${agent.id}`} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                    <span>View Reliability Passport</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                disabled={activePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary btn-sm"
                style={{ opacity: activePage === 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Page {activePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary btn-sm"
                style={{ opacity: activePage === totalPages ? 0.5 : 1 }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
