import type { Metadata } from 'next';
import { PageLayout, ProseSection } from '@/components/content/PageLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Hirebotai collects, uses and protects your personal data, including license keys, account details and payment information.',
  alternates: { canonical: 'https://hirebotai.in/legal/privacy' },
};

export default function PrivacyPage() {
  return (
    <PageLayout badge="Legal" title="Privacy Policy" updatedAt="August 2026">
      <ProseSection title="1. What we collect">
        <ul className="list-disc list-inside space-y-2">
          <li>Account information: email address and password hash when you create an account.</li>
          <li>License data: your license key, plan type, activation status and hardware identifier (HWID) used to bind a license to one PC.</li>
          <li>Payment information: processed securely by Razorpay; we do not store card numbers.</li>
          <li>Usage diagnostics: app version and anonymized crash reports used to improve stability.</li>
        </ul>
      </ProseSection>

      <ProseSection title="2. How we use your data">
        <ul className="list-disc list-inside space-y-2">
          <li>To operate your account and deliver your license keys.</li>
          <li>To activate and validate licenses on your devices.</li>
          <li>To process payments and prevent fraud.</li>
          <li>To provide support and respond to your requests.</li>
          <li>To improve the product and fix bugs.</li>
        </ul>
      </ProseSection>

      <ProseSection title="3. What we do not do">
        <p>
          We do not sell your personal data. We do not share your data with third parties except
          where required to operate the service (payment processing, email delivery, cloud
          infrastructure) or where required by law. Screen captures and audio captured by the app
          are processed through your own configured AI provider API keys and are not stored on our
          servers.
        </p>
      </ProseSection>

      <ProseSection title="4. Data retention & your rights">
        <p>
          You may request a copy, correction, or deletion of your personal data at any time by
          emailing <span className="text-brand-400">hello@hirebotai.in</span>. We delete account
          data when an account is closed, except where we are legally required to retain it.
        </p>
      </ProseSection>

      <ProseSection title="5. Contact">
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
