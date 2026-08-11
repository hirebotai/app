import type { Metadata } from 'next';
import { PageLayout, ProseSection } from '@/components/content/PageLayout';

export const metadata: Metadata = {
  title: 'End User License Agreement (EULA)',
  description:
    'The license agreement for the Hirebotai desktop application, including device binding, subscription terms and refund policy.',
  alternates: { canonical: 'https://hirebotai.in/legal/eula' },
};

export default function EulaPage() {
  return (
    <PageLayout badge="Legal" title="End User License Agreement" updatedAt="August 2026">
      <ProseSection title="1. Grant of license">
        <p>
          Subject to your compliance with this agreement and payment of applicable fees, we grant
          you a non-exclusive, non-transferable, personal license to install and use the Hirebotai
          desktop application on one (1) Windows PC.
        </p>
      </ProseSection>

      <ProseSection title="2. Device binding">
        <ul className="list-disc list-inside space-y-2">
          <li>Each license key is bound to a single device using a hardware identifier (HWID).</li>
          <li>You may not share, resell or transfer your license key to another device or user.</li>
          <li>If you need to move a license to a new PC, contact support to request a one-time transfer.</li>
        </ul>
      </ProseSection>

      <ProseSection title="3. Subscriptions & renewal">
        <p>
          Monthly and yearly plans are subscriptions that renew automatically at the then-current
          price until cancelled. You can cancel from your account dashboard or by contacting
          support. Lifetime plans are a one-time payment for the lifetime of the product; they do
          not require renewal.
        </p>
      </ProseSection>

      <ProseSection title="4. Refunds">
        <p>
          If you are unable to activate your license due to a technical issue we cannot resolve, we
          will refund your purchase within 7 days of payment. Contact{' '}
          <a href="mailto:hello@hirebotai.in" className="text-brand-400 hover:underline">
            hello@hirebotai.in
          </a>{' '}
          with your order details. Abuse of the refund policy may result in license revocation.
        </p>
      </ProseSection>

      <ProseSection title="5. Restrictions">
        <p>
          You may not reverse engineer, decompile, modify, or create derivative works of the
          application, except as permitted by law. You may not circumvent licensing or copy
          protection mechanisms, or use the application in any manner that violates the law or the
          rules of the environment in which you use it.
        </p>
      </ProseSection>

      <ProseSection title="6. Termination">
        <p>
          We may terminate this license if you breach these terms. Upon termination, you must
          uninstall the application and cease all use. Sections regarding disclaimers, limitation
          of liability and governing law survive termination.
        </p>
      </ProseSection>
    </PageLayout>
  );
}
