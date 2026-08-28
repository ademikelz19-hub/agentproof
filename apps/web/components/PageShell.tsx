import type { ReactNode } from 'react';

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 1.5rem' }}>
      <SiteNav />
      <main style={{ paddingBottom: '4rem' }}>{children}</main>
    </div>
  );
}

export function SiteNav() {
  return (
    <nav
      style={{
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
        padding: '1.5rem 0',
        borderBottom: '1px solid #e5e5e5',
        marginBottom: '2rem',
        fontSize: '0.95rem',
      }}
    >
      <a href="/" style={{ fontWeight: 700, textDecoration: 'none', color: 'inherit', marginRight: 'auto' }}>
        AgentProof
      </a>
      <a href="/agents">Explore Agents</a>
      <a href="/methodology">Methodology</a>
      <a href="/developers">Developers</a>
    </nav>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        border: '1px dashed #ccc',
        borderRadius: 8,
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        color: '#555',
      }}
    >
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{title}</h2>
      <p style={{ margin: 0 }}>{body}</p>
    </div>
  );
}
