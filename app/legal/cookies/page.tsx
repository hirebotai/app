import type { Metadata } from 'next';
import { PageLayout, ProseSection } from '@/components/content/PageLayout';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'How the Hirebotai website uses cookies and local storage for authentication, preferences and analytics.',
  alternates: { canonical: 'https://hirebotai.in/legal/cookies' },
};

export default function CookiesPage() {
  return (
    <PageLayout badge="Legal" title="Cookie Policy" updatedAt="August 2026">
      <ProseSection title="1. What we use">
        <ul className="list-disc list-inside space-y-2">
          <li><strong className="text-white">Authentication tokens:</strong> stored in your browser to keep you signed in to your account.</li>
          <li><strong className="text-white">Local preferences:</strong> stored in your browser for UI preferences.</li>
          <li><strong className="text-white">Essential functionality:</strong> small amounts of data required for the site to operate correctly.</li>
        </ul>
      </ProseSection>

      <ProseSection title="2. What we don&apos;t use">
        <p>
          We do not use invasive advertising trackers or sell browsing data. Analytics, if enabled,
          are used in aggregate to understand which pages are most useful.
        </p>
      </ProseSection>

      <ProseSection title="3. Managing cookies">
        <p>
          You can clear or block cookies through your browser settings. Note that blocking
          authentication cookies will sign you out and some features (such as the account
          dashboard) will not work.
        </p>
      </ProseSection>

      <ProseSection title="4. Contact">
        <p>
          Questions about this policy? Email{' '}
          <a href="mailto:hello@hirebotai.in" className="text-brand-400 hover:underline">
            hello@hirebotai.in
          </a>
          .
        </p>
      </ProseSection>
    </PageLayout>
  );
}
