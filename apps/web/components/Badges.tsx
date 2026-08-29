import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Database,
  Link2,
  HelpCircle
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
    label = 'VERIFIED SAMPLE';
  } else if (tier === 'MODERATE') {
    bg = 'var(--status-moderate-bg)';
    color = 'var(--status-moderate)';
    border = 'var(--status-moderate-border)';
    label = 'MODERATE SAMPLE';
  } else if (tier === 'LIMITED') {
    bg = 'var(--status-limited-bg)';
    color = 'var(--status-limited)';
    border = 'var(--status-limited-border)';
    label = 'EARLY SAMPLE';
  } else if (tier === 'INSUFFICIENT') {
    bg = 'var(--status-warning-bg)';
    color = 'var(--status-warning)';
    border = 'var(--status-warning-border)';
    label = 'NEW / TESTING';
  }

  return (
    <span
      className="badge"
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
        fontSize: '0.7rem',
        letterSpacing: '0.04em'
      }}
      title={`Sample maturity: ${tier}. Reflects the number of test observations collected.`}
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
    label = 'ONLINE';
  } else if (outcome === 'FAILURE' || outcome === 'AGENT_UNREACHABLE') {
    bg = 'var(--status-failure-bg)';
    color = 'var(--status-failure)';
    border = 'var(--status-failure-border)';
    icon = <XCircle size={11} />;
    label = 'OFFLINE';
  } else if (outcome === 'PROTOCOL_INVALID') {
    bg = 'var(--status-warning-bg)';
    color = 'var(--status-warning)';
    border = 'var(--status-warning-border)';
    icon = <AlertTriangle size={11} />;
    label = 'INVALID DATA';
  } else if (outcome === 'TIMEOUT') {
    bg = 'var(--status-warning-bg)';
    color = 'var(--status-warning)';
    border = 'var(--status-warning-border)';
    icon = <Clock size={11} />;
    label = 'TIMEOUT';
  } else if (outcome === 'BLOCKED_BY_SECURITY_POLICY') {
    bg = 'var(--status-failure-bg)';
    color = 'var(--status-failure)';
    border = 'var(--status-failure-border)';
    icon = <XCircle size={11} />;
    label = 'BLOCKED (SSRF)';
  } else if (outcome === 'NOT_INGESTED') {
    bg = 'rgba(100, 116, 139, 0.1)';
    color = '#64748b';
    border = '1px dashed rgba(100, 116, 139, 0.4)';
    icon = <Clock size={11} />;
    label = 'PENDING';
  }

  return (
    <span
      className="badge"
      style={{
        background: bg,
        color,
        border: border.startsWith('1px') ? border : `1px solid ${border}`,
        fontSize: '0.72rem'
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
    label = 'LIVE TESTED';
  } else if (source === 'ONCHAIN') {
    bg = 'rgba(56, 189, 248, 0.1)';
    color = '#38bdf8';
    border = 'rgba(56, 189, 248, 0.25)';
    label = 'ONCHAIN RECORD';
  } else if (source === 'INDEXER' || source === 'ERC8004_METADATA') {
    bg = 'rgba(129, 140, 248, 0.1)';
    color = '#818cf8';
    border = 'rgba(129, 140, 248, 0.25)';
    label = `REGISTRY (${origin ?? '8004scan'})`;
  }

  return (
    <span
      className="badge font-mono"
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
        fontSize: '0.68rem',
        textTransform: 'none'
      }}
      title={`Data origin: ${source}${origin ? ` via ${origin}` : ''}`}
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
        fontSize: '0.7rem'
      }}
    >
      <Link2 size={10} />
      <span>{protocol}</span>
    </span>
  );
}
