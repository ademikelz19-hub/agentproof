import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Database,
  Link2,
  HelpCircle,
  Lock,
  Activity,
  FileCheck2,
} from 'lucide-react';

export function SufficiencyBadge({ tier }: { tier: string }) {
  let bg = 'rgba(100, 116, 139, 0.15)';
  let color = '#94a3b8';
  let border = 'rgba(100, 116, 139, 0.3)';
  let label = tier;

  if (tier === 'STRONG') {
    bg = 'var(--status-strong-bg)';
    color = 'var(--status-strong)';
    border = 'var(--status-strong-border)';
    label = 'STRONG EVIDENCE';
  } else if (tier === 'MODERATE') {
    bg = 'var(--status-moderate-bg)';
    color = 'var(--status-moderate)';
    border = 'var(--status-moderate-border)';
    label = 'MODERATE EVIDENCE';
  } else if (tier === 'LIMITED') {
    bg = 'var(--status-limited-bg)';
    color = 'var(--status-limited)';
    border = 'var(--status-limited-border)';
    label = 'LIMITED EVIDENCE';
  } else if (tier === 'INSUFFICIENT') {
    bg = 'var(--status-warning-bg)';
    color = 'var(--status-warning)';
    border = 'var(--status-warning-border)';
    label = 'INSUFFICIENT EVIDENCE';
  }

  return (
    <span
      className="badge"
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
        fontSize: '0.7rem',
        letterSpacing: '0.04em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
      }}
      title={`Evidence coverage: ${tier}. Describes sample depth, not a trust or safety rating.`}
    >
      <ShieldCheck size={11} />
      <span>{label}</span>
    </span>
  );
}

export function OutcomeBadge({ outcome }: { outcome: string }) {
  let bg = 'rgba(100, 116, 139, 0.15)';
  let color = '#94a3b8';
  let border = 'rgba(100, 116, 139, 0.3)';
  let icon = <HelpCircle size={11} />;
  let label = outcome.replace(/_/g, ' ');

  if (outcome === 'SUCCESS' || outcome === 'REACHABLE') {
    bg = 'var(--status-success-bg)';
    color = 'var(--status-success)';
    border = 'var(--status-success-border)';
    icon = <CheckCircle2 size={11} />;
    label = 'SUCCESS (ONLINE)';
  } else if (outcome === 'FAILURE' || outcome === 'AGENT_UNREACHABLE' || outcome === 'DNS_FAILURE') {
    bg = 'var(--status-failure-bg)';
    color = 'var(--status-failure)';
    border = 'var(--status-failure-border)';
    icon = <XCircle size={11} />;
    label = outcome === 'DNS_FAILURE' ? 'DNS FAILURE' : 'UNREACHABLE';
  } else if (outcome === 'PROTOCOL_INVALID') {
    bg = 'rgba(168, 85, 247, 0.12)';
    color = '#c084fc';
    border = 'rgba(168, 85, 247, 0.3)';
    icon = <AlertTriangle size={11} />;
    label = 'INVALID PROTOCOL';
  } else if (outcome === 'TIMEOUT') {
    bg = 'var(--status-warning-bg)';
    color = 'var(--status-warning)';
    border = 'var(--status-warning-border)';
    icon = <Clock size={11} />;
    label = 'TIMEOUT';
  } else if (outcome === 'BLOCKED_BY_SECURITY_POLICY') {
    bg = 'rgba(148, 163, 184, 0.12)';
    color = '#94a3b8';
    border = 'rgba(148, 163, 184, 0.3)';
    icon = <Lock size={11} />;
    label = 'POLICY BLOCKED (SSRF)';
  } else if (outcome === 'UPSTREAM_INDEXER_FAILURE' || outcome === 'AGENTPROOF_INTERNAL_ERROR') {
    bg = 'rgba(100, 116, 139, 0.1)';
    color = '#64748b';
    border = '1px dashed rgba(100, 116, 139, 0.4)';
    icon = <AlertTriangle size={11} />;
    label = 'RUNNER EXCLUDED';
  } else if (outcome === 'NOT_INGESTED') {
    bg = 'rgba(100, 116, 139, 0.1)';
    color = '#64748b';
    border = '1px dashed rgba(100, 116, 139, 0.4)';
    icon = <Clock size={11} />;
    label = 'PENDING';
  }

  return (
    <span
      className="badge font-mono"
      style={{
        background: bg,
        color,
        border: border.startsWith('1px') ? border : `1px solid ${border}`,
        fontSize: '0.7rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
      }}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

export function ProvenanceBadge({ source, origin }: { source: string; origin?: string }) {
  let bg = 'var(--bg-surface-2)';
  let color = 'var(--text-secondary)';
  let border = 'var(--border-subtle)';
  let label = source;

  if (source === 'AGENTPROOF_MEASUREMENT') {
    bg = 'rgba(240, 185, 11, 0.12)';
    color = 'var(--accent-bnb)';
    border = 'var(--accent-bnb-border)';
    label = 'AGENTPROOF MEASUREMENT';
  } else if (source === 'ONCHAIN') {
    bg = 'rgba(56, 189, 248, 0.1)';
    color = '#38bdf8';
    border = 'rgba(56, 189, 248, 0.25)';
    label = 'ONCHAIN RECORD';
  } else if (source === 'INDEXER') {
    bg = 'rgba(129, 140, 248, 0.1)';
    color = '#818cf8';
    border = 'rgba(129, 140, 248, 0.25)';
    label = `INDEXER (${origin ?? '8004scan'})`;
  } else if (source === 'ERC8004_METADATA') {
    bg = 'rgba(148, 163, 184, 0.1)';
    color = '#94a3b8';
    border = 'rgba(148, 163, 184, 0.25)';
    label = 'ERC-8004 METADATA';
  }

  return (
    <span
      className="badge font-mono"
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
        fontSize: '0.68rem',
        textTransform: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
      }}
      title={`Data provenance: ${source}${origin ? ` via ${origin}` : ''}`}
    >
      <Database size={10} />
      <span>{label}</span>
    </span>
  );
}

export function ProtocolBadge({ protocol }: { protocol: string }) {
  return (
    <span
      className="badge font-mono"
      style={{
        background: 'var(--bg-surface-3)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-medium)',
        fontSize: '0.7rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
      }}
    >
      <Link2 size={10} />
      <span>{protocol}</span>
    </span>
  );
}

export function MonitoringStatusBadge({ isMonitored }: { isMonitored: boolean }) {
  if (isMonitored) {
    return (
      <span
        className="badge font-mono"
        style={{
          background: 'var(--status-success-bg)',
          color: 'var(--status-success)',
          border: '1px solid var(--status-success-border)',
          fontSize: '0.7rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
        title="Included in AgentProof scheduled automated probe monitoring cycles."
      >
        <span className="live-pulse" style={{ width: 6, height: 6 }} />
        <span>ACTIVELY MONITORED</span>
      </span>
    );
  }

  return (
    <span
      className="badge font-mono"
      style={{
        background: 'var(--bg-surface-2)',
        color: 'var(--text-muted)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.7rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
      }}
      title="Indexed from registry, currently in standby cohort."
    >
      <Activity size={10} />
      <span>INDEXED (STANDBY)</span>
    </span>
  );
}

export function MetadataStatusBadge({ resolved }: { resolved: boolean }) {
  if (resolved) {
    return (
      <span
        className="badge font-mono"
        style={{
          background: 'rgba(56, 189, 248, 0.1)',
          color: '#38bdf8',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          fontSize: '0.68rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
        }}
        title="Metadata structure successfully resolved from offchain URI."
      >
        <FileCheck2 size={10} />
        <span>METADATA RESOLVED</span>
      </span>
    );
  }

  return (
    <span
      className="badge font-mono"
      style={{
        background: 'var(--bg-surface-2)',
        color: 'var(--text-muted)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.68rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
      }}
      title="Metadata offchain resolution pending or not provided."
    >
      <Clock size={10} />
      <span>METADATA PENDING</span>
    </span>
  );
}
