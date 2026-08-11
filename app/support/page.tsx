import { Metadata } from 'next';
import { SupportPageClient } from './SupportPageClient';

export const metadata: Metadata = {
  title: 'Support — FAQs, Troubleshooting & Help',
  description:
    'Hirebotai support: FAQs, troubleshooting guides, license activation help, hotkey reference and direct contact with the team.',
  alternates: { canonical: 'https://hirebotai.in/support' },
  openGraph: {
    title: 'Support — FAQs, Troubleshooting & Help',
    description:
      'FAQs, troubleshooting, license activation help and direct contact with the Hirebotai team.',
    url: 'https://hirebotai.in/support',
  },
};

export default function SupportPage() {
  return <SupportPageClient />;
}
