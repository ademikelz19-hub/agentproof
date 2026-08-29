'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, ArrowUpRight, ExternalLink, ShieldCheck, Layers, Server } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { ProtocolBadge, ProvenanceBadge } from './Badges';
import type { AgentIdentity } from '@agentproof/core';

interface AgentListItem extends AgentIdentity {
  name?: string | null;
  description?: string | null;
  metadataResolved?: boolean;
  serviceCount?: number;
  services?: { id: string; protocol: string; url: string }[];
  lastIngestedAt?: string | Date;
}

export function AgentExplorerTable({ agents }: { agents: AgentListItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'WITH_SERVICES' | 'RESOLVED'>('ALL');

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
      if (filterMode === 'WITH_SERVICES') {
        return (agent.serviceCount ?? 0) > 0 || (agent.services && agent.services.length > 0);
      }
      if (filterMode === 'RESOLVED') {
        return agent.metadataResolved === true;
      }
      return true;
    });
  }, [agents, searchTerm, filterMode]);

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
              placeholder="Search by Agent ID (e.g. 316380), Name, or Keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              onClick={() => setFilterMode('ALL')}
              className={`btn btn-sm ${filterMode === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All ({agents.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('WITH_SERVICES')}
              className={`btn btn-sm ${filterMode === 'WITH_SERVICES' ? 'btn-primary' : 'btn-secondary'}`}
            >
              With Services
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('RESOLVED')}
              className={`btn btn-sm ${filterMode === 'RESOLVED' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Resolved Metadata
            </button>
          </div>
        </div>
      </div>

      {/* Results Count Summary */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>
          Showing {filteredAgents.length} of {agents.length} monitored agents
        </span>
        <span>BNB Chain (56) • ERC-8004 Registry</span>
      </div>

      {/* Desktop Data Table */}
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
            }}
            className="btn btn-secondary btn-sm"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent Identity</th>
                <th>Onchain ID</th>
                <th>Declared Services</th>
                <th>Provenance Source</th>
                <th>Last Observed</th>
                <th style={{ textAlign: 'right' }}>Passport</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map((agent) => (
                <tr key={agent.id}>
                  {/* Agent Identity */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
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
                      {agent.description && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            maxWidth: 260,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {agent.description}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Onchain ID with Copy */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        #{agent.onchainId}
                      </span>
                      <CopyButton text={agent.id} label="ID" />
                    </div>
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
                        0 services declared
                      </span>
                    )}
                  </td>

                  {/* Provenance */}
                  <td>
                    <ProvenanceBadge source={agent.provenance.source} origin={agent.provenance.origin} />
                  </td>

                  {/* Last Observed */}
                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(agent.provenance.observedAt).toLocaleDateString()}
                    </span>
                  </td>

                  {/* Action Link */}
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      href={`/agents/${agent.chain}/${agent.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.3rem 0.6rem' }}
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
      )}
    </div>
  );
}
