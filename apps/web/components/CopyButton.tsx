'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({
  text,
  label = 'Copy',
  className = '',
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      title={copied ? 'Copied!' : `Copy ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.25rem 0.5rem',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-mono)',
        background: copied ? 'var(--status-success-bg)' : 'var(--bg-surface-2)',
        color: copied ? 'var(--status-success)' : 'var(--text-secondary)',
        border: `1px solid ${copied ? 'var(--status-success-border)' : 'var(--border-subtle)'}`,
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      className={className}
    >
      {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}
