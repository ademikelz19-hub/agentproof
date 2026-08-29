'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Activity, Code, BookOpen, Menu, X } from 'lucide-react';
import { GithubIcon } from './Icons';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/agents', label: 'Explore Agents', icon: Activity },
    { href: '/methodology', label: 'Methodology', icon: BookOpen },
    { href: '/developers', label: 'Developers & API', icon: Code },
  ];

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(6, 9, 17, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand & Network Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontWeight: 800,
              fontSize: '1.15rem',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #f0b90b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                boxShadow: '0 0 14px rgba(240, 185, 11, 0.35)',
              }}
            >
              <Shield size={18} strokeWidth={2.5} />
            </div>
            <span>AgentProof</span>
          </Link>

          <div
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.65rem',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 9999,
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
            }}
            className="network-tag"
          >
            <span className="live-pulse" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>BNB Chain</span>
            <span style={{ color: 'var(--text-muted)' }}>• Live Probing</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-surface-2)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--border-medium)' : 'transparent'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} color={isActive ? 'var(--accent-bnb)' : 'var(--text-muted)'} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 0.5rem' }} />

          <a
            href="https://github.com/ademikelz19-hub/agentproof"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.75rem',
              borderRadius: 6,
              fontSize: '0.825rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
            }}
            title="View Source on GitHub"
          >
            <GithubIcon size={14} />
            <span>GitHub</span>
          </a>
        </nav>

        {/* Mobile Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
          className="mobile-toggle"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface-1)',
            padding: '1rem 1.5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: 'var(--bg-surface-2)',
              borderRadius: 6,
              fontSize: '0.8rem',
              marginBottom: '0.5rem',
            }}
          >
            <span className="live-pulse" />
            <span>BNB Chain Mainnet (56) • Active Probing</span>
          </div>

          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem',
                  borderRadius: 6,
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-surface-2)' : 'transparent',
                }}
              >
                <Icon size={16} color={isActive ? 'var(--accent-bnb)' : 'var(--text-muted)'} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <a
            href="https://github.com/ademikelz19-hub/agentproof"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem',
              borderRadius: 6,
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              marginTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <GithubIcon size={16} />
            <span>Source Code on GitHub</span>
          </a>
        </div>
      )}

      <style jsx global>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .network-tag {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
