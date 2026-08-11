import { Metadata } from 'next';
import { PricingPageClient } from './PricingPageClient';

export const metadata: Metadata = {
  title: 'Pricing — Free Trial, Pro Monthly, Yearly & Lifetime Plans',
  description:
    'Hirebotai pricing: free 24-hour trial, Pro Monthly, Pro Yearly (17% off) and Lifetime plans. Transparent, developer-friendly pricing for every budget.',
  alternates: { canonical: 'https://hirebotai.in/pricing' },
  openGraph: {
    title: 'Pricing — Free Trial, Pro Monthly, Yearly & Lifetime Plans',
    description:
      'Free 24-hour trial, Pro Monthly, Pro Yearly (17% off) and Lifetime plans for developers.',
    url: 'https://hirebotai.in/pricing',
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}