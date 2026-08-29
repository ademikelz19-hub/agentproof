import React from 'react';
import { HelpCircle } from 'lucide-react';

export function MetricCard({
  label,
  value,
  subvalue,
  description,
  icon: Icon,
  accent = 'var(--border-subtle)',
  tooltip,
}: {
  label: string;
  value: React.ReactNode;
  subvalue?: string;
  description?: string;
  icon?: any;
  accent?: string;
  tooltip?: string;
}) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accent,
        }}
      />

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
              }}
            >
              {label}
            </span>
            {tooltip && (
              <span title={tooltip} style={{ color: 'var(--text-muted)', cursor: 'help' }}>
                <HelpCircle size={12} />
              </span>
            )}
          </div>
          {Icon && (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'var(--bg-surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <Icon size={15} />
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: '1.85rem',
            fontWeight: 700,
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </div>

        {subvalue && (
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginTop: '0.35rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {subvalue}
          </div>
        )}
      </div>

      {description && (
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}
