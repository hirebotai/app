import { HeroSection } from '@/components/hero/HeroSection';
import { FeaturesPreview } from '@/components/features/FeaturesPreview';
import { SocialProof } from '@/components/features/SocialProof';
import { UndetectableSection } from '@/components/features/UndetectableSection';
import { PricingPreview } from '@/components/pricing/PricingPreview';
import { CTASection } from '@/components/features/CTASection';
import { ScrollReveal, StaggerContainer } from '@/components/animations';
import { JsonLd } from '@/components/seo/JsonLd';

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Hirebotai',
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Windows',
          description:
            'AI interview assistant for developers with screen capture solving, real-time audio transcription, resume context and practice room.',
          url: 'https://hirebotai.in',
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'INR',
            lowPrice: '0',
            highPrice: '4999',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            ratingCount: '1029',
          },
        }}
      />
      <HeroSection />

      <UndetectableSection />

      <FeaturesPreview />

      <SocialProof />

      <PricingPreview />

      <CTASection />

      <ScrollReveal direction="up" className="py-20 px-4">
        <footer className="mx-auto max-w-7xl text-center flex flex-col items-center justify-center space-y-2">
          <div className="flex items-center gap-2 text-surface-400 font-mono text-sm">
            <span>© {new Date().getFullYear()} Hirebot AI</span>
            <span className="text-surface-700">•</span>
            <span>Engineered in India</span>
          </div>
          <p className="text-xs text-surface-600 font-medium">Built for ambitious engineers worldwide.</p>
        </footer>
      </ScrollReveal>
    </div>
  );
}