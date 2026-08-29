import { PageShell, EmptyState } from '@/components/PageShell';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <PageShell>
      <div style={{ padding: '3rem 0', maxWidth: 600, margin: '0 auto' }}>
        <EmptyState
          icon={ShieldAlert}
          title="Page Not Found"
          body="The requested agent passport, API endpoint, or resource does not exist or has not been indexed yet."
          action={
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <Link href="/agents" className="btn btn-primary btn-sm">
                Browse Monitored Agents
              </Link>
              <Link href="/" className="btn btn-secondary btn-sm">
                <ArrowLeft size={13} />
                <span>Home</span>
              </Link>
            </div>
          }
        />
      </div>
    </PageShell>
  );
}
