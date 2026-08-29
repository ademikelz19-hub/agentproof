import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { AlertCircle, FileSearch } from 'lucide-react';

export function PageShell({
  children,
  maxWidth = 1200,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth,
          margin: '0 auto',
          padding: '2rem 1.5rem 4rem',
        }}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon: Icon = FileSearch,
  action,
}: {
  title: string;
  body: string;
  icon?: any;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        border: '1px dashed var(--border-medium)',
        borderRadius: 10,
        padding: '3rem 2rem',
        textAlign: 'center',
        background: 'var(--bg-surface-1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.85rem',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: 'var(--bg-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <Icon size={22} />
      </div>
      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 500, lineHeight: 1.6 }}>
        {body}
      </p>
      {action && <div style={{ marginTop: '0.75rem' }}>{action}</div>}
    </div>
  );
}
