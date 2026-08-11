import type { Metadata } from 'next';
import { PageLayout, ProseSection } from '@/components/content/PageLayout';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms governing your use of the Hirebotai website, desktop application and paid plans.',
  alternates: { canonical: 'https://hirebotai.in/legal/terms' },
};

export default function TermsPage() {
  return (
    <PageLayout badge="Legal" title="Terms of Service" updatedAt="August 2026">
      <ProseSection title="1. Acceptance of terms">
        <p>
          By creating an account, downloading the application, or purchasing a plan, you agree to
          these Terms of Service. If you do not agree, do not use the service.
        </p>
      </ProseSection>

      <ProseSection title="2. The service">
        <p>
          Hirebotai provides a Windows desktop application that assists developers during technical
          interview preparation and practice, including screen capture solving, audio
          transcription, resume context and a practice room.
        </p>
      </ProseSection>

      <ProseSection title="3. Accounts & licenses">
        <ul className="list-disc list-inside space-y-2">
          <li>You are responsible for keeping your account credentials secure.</li>
          <li>Licenses are device-bound and valid for one PC only, as described in the EULA.</li>
          <li>Subscriptions renew automatically until cancelled. You may cancel anytime from your account or by contacting support.</li>
          <li>Refunds are handled per the EULA and applicable law; contact support within 7 days of purchase for issues with activation.</li>
        </ul>
      </ProseSection>

      <ProseSection title="4. Acceptable use">
        <p>
          You agree to use the service in compliance with all applicable laws and the terms of the
          interview, assessment or examination environments in which you use it. You are solely
          responsible for how you use the application, including compliance with any rules set by
          employers, educational institutions or proctoring services.
        </p>
      </ProseSection>

      <ProseSection title="5. Disclaimers">
        <p>
          The service is provided "as is" without warranties of any kind, express or implied. We do
          not guarantee any interview outcome, job offer or pass rate. To the maximum extent
          permitted by law, our total liability for any claim is limited to the amount you paid for
          the service in the twelve months preceding the claim.
        </p>
      </ProseSection>

      <ProseSection title="6. Changes & contact">
        <p>
          We may update these terms from time to time. Continued use after changes constitutes
          acceptance. Questions? Email{' '}
          <a href="mailto:hello@hirebotai.in" className="text-brand-400 hover:underline">
            hello@hirebotai.in
          </a>
          .
        </p>
      </ProseSection>
    </PageLayout>
  );
}
