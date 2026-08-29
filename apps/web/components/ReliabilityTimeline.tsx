'use client';

import React, { useState } from 'react';
import { Activity, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { ProbeObservation } from '@agentproof/core';

export function ReliabilityTimeline({
  observations = [],
  windowLabel = 'Recent Probe Activity',
}: {
  observations: ProbeObservation[];
  windowLabel?: string;
}) {
  const [hoveredObs, setHoveredObs] = useState<ProbeObservation | null>(null);

  if (observations.length === 0) {
    return (
      <div
        style={{
          padding: '1.5rem',
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          textAlign: 'center',
        }}
      >
        No probe observations in this window.
      </div>
    );
  }

  // Sort chronologically ascending for the timeline bars
  const sorted = [...observations].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const total = sorted.length;
  const successes = sorted.filter((o) => o.outcome === 'SUCCESS').length;
  const timeouts = sorted.filter((o) => o.outcome === 'TIMEOUT').length;
  const failures = total - successes - timeouts;
  const successPct = total > 0 ? ((successes / total) * 100).toFixed(1) : '0';

  const latencies = sorted
    .filter((o) => o.outcome === 'SUCCESS' && typeof o.latencyMs === 'number')
    .map((o) => o.latencyMs as number);

  latencies.sort((a, b) => a - b);
  const medianLatency = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : null;
  const p95Latency =
    latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : null;

  return (
    <div
      style={{
        background: 'var(--bg-surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        padding: '1.25rem',
      }}
    >
      {/* Header with summary stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={16} color="var(--accent-bnb)" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            {windowLabel}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ({total} probes)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Availability: </span>
            <strong style={{ color: Number(successPct) >= 90 ? 'var(--status-success)' : 'var(--status-warning)' }}>
              {successPct}%
            </strong>
          </div>
          {medianLatency !== null && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Median: </span>
              <strong className="font-mono">{medianLatency}ms</strong>
            </div>
          )}
          {p95Latency !== null && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>P95: </span>
              <strong className="font-mono">{p95Latency}ms</strong>
            </div>
          )}
        </div>
      </div>

      {/* Observation streak bars */}
      <div
        style={{
          display: 'flex',
          gap: '3px',
          alignItems: 'flex-end',
          height: 38,
          padding: '4px 0',
          overflowX: 'auto',
        }}
      >
        {sorted.map((obs) => {
          const isSuccess = obs.outcome === 'SUCCESS';
          const isTimeout = obs.outcome === 'TIMEOUT';
          const bg = isSuccess
            ? 'var(--status-success)'
            : isTimeout
            ? 'var(--status-warning)'
            : 'var(--status-failure)';

          // Scale height based on latency if available
          let heightPct = 60;
          if (isSuccess && obs.latencyMs) {
            heightPct = Math.min(100, Math.max(35, (obs.latencyMs / 1500) * 100));
          } else if (!isSuccess) {
            heightPct = 100;
          }

          const isHovered = hoveredObs?.id === obs.id;

          return (
            <div
              key={obs.id}
              onMouseEnter={() => setHoveredObs(obs)}
              onMouseLeave={() => setHoveredObs(null)}
              style={{
                flex: '1 0 6px',
                maxWidth: 12,
                minWidth: 4,
                height: `${heightPct}%`,
                background: bg,
                opacity: isHovered ? 1 : 0.8,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                transform: isHovered ? 'scaleY(1.15)' : 'scaleY(1)',
                boxShadow: isHovered ? `0 0 8px ${bg}` : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Hover Tooltip / Detail Box */}
      <div
        style={{
          marginTop: '0.85rem',
          padding: '0.6rem 0.85rem',
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 6,
          fontSize: '0.78rem',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: 34,
        }}
      >
        {hoveredObs ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {hoveredObs.outcome === 'SUCCESS' ? (
                <CheckCircle size={13} color="var(--status-success)" />
              ) : (
                <XCircle size={13} color="var(--status-failure)" />
              )}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {hoveredObs.probeType}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {hoveredObs.outcome}
              </span>
              {hoveredObs.httpStatus && (
                <span style={{ color: 'var(--text-muted)' }}>
                  (HTTP {hoveredObs.httpStatus})
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.85rem', color: 'var(--text-muted)' }}>
              {hoveredObs.latencyMs !== undefined && (
                <span>{hoveredObs.latencyMs}ms</span>
              )}
              <span>{new Date(hoveredObs.timestamp).toLocaleTimeString()}</span>
            </div>
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Hover over any probe bar above to view timestamp, latency, and response status.
          </span>
        )}
      </div>
    </div>
  );
}
