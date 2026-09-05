'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowUpRight, ChevronLeft, ChevronRight, Activity, Database, CheckCircle2, Shield } from 'lucide-react';
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
}

const PAGE_SIZE = 25;

export function AgentExplorerTable({ agents }: { agents: AgentListItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'MONITORED' | 'WITH_SERVICES' | 'RESOLVED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      // Search filter
      const matchesSearch =
        agent.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.onchainId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agent.name && agent.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (agent.description && agent.description.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // Mode filter
      if (filterMode === 'MONITORED') {
        return agent.isMonitored === true || (agent.observationCount ?? 0) > 0;
      }
      if (filterMode === 'WITH_SERVICES') {
        return (agent.serviceCount ?? 0) > 0 || (agent.services && agent.services.length > 0);
      }
      if (filterMode === 'RESOLVED') {
        return agent.metadataResolved === true;
      }
      return true;
    });
  }, [agents, searchTerm, filterMode]);

  // Reset to page 1 whenever filters change
  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedAgents = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return filteredAgents.slice(start, start + PAGE_SIZE);
  }, [filteredAgents, activePage]);

  const monitoredCount = useMemo(() => {
    return agents.filter((a) => a.isMonitored || (a.observationCount ?? 0) > 0).length;
  }, [agents]);

  return (
    <div>
      {/* Search & Filter Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 300px',
              maxWidth: 480,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            >
              <Search size={15} />
            </div>
            <input
              type="text"
              placeholder="Search by Token ID (#316380), Name, or Keyword..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
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

          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setFilterMode('ALL');
                setCurrentPage(1);
              }}
              className={`btn btn-sm ${filterMode === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Indexed ({agents.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('MONITORED');
                setCurrentPage(1);
              }}
              className={`btn btn-sm ${filterMode === 'MONITORED' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Actively Monitored ({monitoredCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('WITH_SERVICES');
                setCurrentPage(1);
              }}
              className={`btn btn-sm ${filterMode === 'WITH_SERVICES' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Has Endpoints
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('RESOLVED');
                setCurrentPage(1);
              }}
              className={`btn btn-sm ${filterMode === 'RESOLVED' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Metadata Resolved
            </button>
          </div>
        </div>
      </div>

      {/* Results Count & Pagination Header */}
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
          Showing {filteredAgents.length === 0 ? 0 : (activePage - 1) * PAGE_SIZE + 1}–
          {Math.min(activePage * PAGE_SIZE, filteredAgents.length)} of {filteredAgents.length} agents
        </span>
        <span>BNB Chain (56) • ERC-8004 Registry</span>
      </div>

      {/* Empty State */}
      {filteredAgents.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>No agents match your filter criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterMode('ALL');
              setCurrentPage(1);
            }}
            className="btn btn-secondary btn-sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View (Hidden on mobile < 768px via CSS) */}
          <div className="table-container desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent Name & ID</th>
                  <th>Monitoring Status</th>
                  <th>Declared Endpoints</th>
                  <th>Metadata</th>
                  <th>Provenance</th>
                  <th style={{ textAlign: 'right' }}>Passport</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAgents.map((agent) => (
                  <tr key={agent.id}>
                    {/* Agent Identity */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Link
                            href={`/agents/${agent.chain}/${agent.id}`}
                            style={{
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <span className="font-mono">{agent.name ?? agent.id}</span>
                          </Link>
                          <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            #{agent.onchainId}
                          </span>
                        </div>
                        {agent.description && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              maxWidth: 320,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={agent.description}
                          >
                            {agent.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Monitoring Cohort */}
                    <td>
                      <MonitoringStatusBadge isMonitored={Boolean(agent.isMonitored || (agent.observationCount ?? 0) > 0)} />
                    </td>

                    {/* Declared Services */}
                    <td>
                      {agent.services && agent.services.length > 0 ? (
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {agent.services.map((s) => (
                            <ProtocolBadge key={s.id} protocol={s.protocol} />
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          0 declared
                        </span>
                      )}
                    </td>

                    {/* Metadata Status */}
                    <td>
                      <MetadataStatusBadge resolved={agent.metadataResolved ?? false} />
                    </td>

                    {/* Provenance */}
                    <td>
                      <ProvenanceBadge source={agent.provenance.source} origin={agent.provenance.origin} />
                    </td>

                    {/* Action Link */}
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        href={`/agents/${agent.chain}/${agent.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.65rem' }}
                      >
                        <span>Passport</span>
                        <ArrowUpRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Rendered on screens < 768px) */}
          <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {paginatedAgents.map((agent) => (
              <div
                key={agent.id}
                className="card"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div>
                    <Link
                      href={`/agents/${agent.chain}/${agent.id}`}
                      style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {agent.name ?? agent.id}
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        #{agent.onchainId}
                      </span>
                      <CopyButton text={agent.id} label="ID" />
                    </div>
                  </div>
                  <MonitoringStatusBadge isMonitored={Boolean(agent.isMonitored || (agent.observationCount ?? 0) > 0)} />
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
                  {agent.services && agent.services.length > 0 ? (
                    agent.services.map((s) => <ProtocolBadge key={s.id} protocol={s.protocol} />)
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>0 endpoints</span>
                  )}
                </div>

                <Link
                  href={`/agents/${agent.chain}/${agent.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <span>View Reliability Passport</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            ))}
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
