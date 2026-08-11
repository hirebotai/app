import type { ReactNode } from 'react';
import Link from 'next/link';

interface PageLayoutProps {
  badge?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  updatedAt?: string;
}

export function PageLayout({ badge, title, subtitle, children, updatedAt }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-950 text-surface-50 pt-8 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center space-y-4 mb-12">
          {badge && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono font-semibold uppercase tracking-wider">
              {badge}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight">
            {title}
          </h1>
          {subtitle && <p className="max-w-2xl mx-auto text-surface-400 text-base">{subtitle}</p>}
          {updatedAt && (
            <p className="text-xs font-mono text-surface-500">Last updated: {updatedAt}</p>
          )}
        </header>

        <div className="space-y-8">{children}</div>

        <footer className="mt-16 pt-8 border-t border-surface-800 flex items-center justify-between">
          <Link href="/" className="text-sm text-surface-400 hover:text-brand-400 transition-colors">
            ← Back to Home
          </Link>
          <Link href="/support" className="text-sm text-surface-400 hover:text-brand-400 transition-colors">
            Need help? Contact Support
          </Link>
        </footer>
      </div>
    </div>
  );
}

export function ProseSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-bold font-mono text-white mb-4">{title}</h2>
      <div className="space-y-4 text-surface-300 text-base leading-relaxed">{children}</div>
    </section>
  );
}
