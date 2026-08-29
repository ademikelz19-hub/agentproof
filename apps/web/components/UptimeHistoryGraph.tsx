'use client';

import React, { useMemo, useState } from 'react';
import { History, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import type { ProbeObservation } from '@agentproof/core';

interface CycleSummary {
  cycleId: string;
  runIndex: number;
  timestamp: Date;
  total: number;
  successes: number;
  failures: number;
  availabilityPct: number;
  medianLatency: number | null;
}

export function UptimeHistoryGraph({
  observations = [],
}: {
  observations: ProbeObservation[];
}) {
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  // Group observations into discrete monitoring cycles (observations within 10 minutes belong to the same cycle)
  const cycles = useMemo<CycleSummary[]>(() => {
    if (!observations.length) return [];

    // Sort chronologically ascending
    const sorted = [...observations].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const groups: ProbeObservation[][] = [];
    let currentGroup: ProbeObservation[] = [];

    for (const obs of sorted) {
      const obsTime = new Date(obs.timestamp).getTime();
      if (currentGroup.length === 0) {
        currentGroup.push(obs);
      } else {
        const lastTime = new Date(currentGroup[currentGroup.length - 1]!.timestamp).getTime();
        // If within 10 minutes (600,000 ms), same run cycle
        if (Math.abs(obsTime - lastTime) < 600000) {
          currentGroup.push(obs);
        } else {
          groups.push(currentGroup);
          currentGroup = [obs];
        }
      }
    }
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups.map((group, idx) => {
      const total = group.length;
      const successes = group.filter((o) => o.outcome === 'SUCCESS').length;
      const failures = total - successes;
      const availabilityPct = total > 0 ? (successes / total) * 100 : 0;

      const latencies = group
        .filter((o) => o.outcome === 'SUCCESS' && typeof o.latencyMs === 'number')
        .map((o) => o.latencyMs as number)
        .sort((a, b) => a - b);

      const medianLatency =
        latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)]! : null;

      const firstTime = new Date(group[0]!.timestamp);

      return {
        cycleId: 'cycle-' + idx + '-' + firstTime.getTime(),
        runIndex: idx + 1,
        timestamp: firstTime,
        total,
        successes,
        failures,
        availabilityPct,
        medianLatency,
      };
    });
  }, [observations]);

  if (observations.length === 0) {
    return null;
  }

  // Display newest cycles first
  const displayCycles = [...cycles].reverse();

  return (
    <div
      style={{
        background: 'var(--bg-surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={16} color="var(--accent-bnb)" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            Run-by-Run Uptime History
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-surface-2)',
              padding: '0.15rem 0.5rem',
              borderRadius: 4,
              border: '1px solid var(--border-subtle)',
            }}
          >
            {cycles.length} {cycles.length === 1 ? 'cycle' : 'cycles'} recorded
          </span>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Total checks: <strong style={{ color: 'var(--text-primary)' }}>{observations.length}</strong>
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
        Each bar reflects an automated health check cycle run by the continuous monitoring pipeline. Uptime scores are averaged per run to track reliability consistency.
      </p>

      {/* Cycle Bars List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {displayCycles.map((cycle) => {
          const avail = cycle.availabilityPct;
          const barColor =
            avail >= 90
              ? 'var(--status-success)'
              : avail >= 70
              ? 'var(--status-warning)'
              : 'var(--status-failure)';

          const isSelected = selectedCycleId === cycle.cycleId;

          return (
            <div
              key={cycle.cycleId}
              onClick={() => setSelectedCycleId(isSelected ? null : cycle.cycleId)}
              style={{
                background: isSelected ? 'var(--bg-surface-2)' : 'var(--bg-surface-1)',
                border: '1px solid ' + (isSelected ? 'var(--accent-bnb-border)' : 'var(--border-subtle)'),
                borderRadius: 6,
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Cycle #{cycle.runIndex}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} />
                    {cycle.timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                    {cycle.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                  {cycle.medianLatency !== null && (
                    <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Zap size={12} />
                      <strong className="font-mono" style={{ color: 'var(--text-secondary)' }}>{cycle.medianLatency}ms</strong>
                    </span>
                  )}
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: barColor }}>
                    {avail.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: 6,
                  background: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: Math.max(4, avail) + '%',
                    height: '100%',
                    background: barColor,
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Collapsible / summary stats */}
              <div
                style={{
                  marginTop: '0.45rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    <CheckCircle2 size={11} color="var(--status-success)" />
                    {cycle.successes} passed
                  </span>
                  {cycle.failures > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <XCircle size={11} color="var(--status-failure)" />
                      {cycle.failures} failed
                    </span>
                  )}
                </div>
                <span>{cycle.total} probes in cycle</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
