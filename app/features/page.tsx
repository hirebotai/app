import { Metadata } from 'next';
import { FeaturesPageClient } from './FeaturesPageClient';

export const metadata: Metadata = {
  title: 'Features — Screen Capture AI, Audio Transcription & More',
  description:
    'Explore every Hirebotai feature: Screen Capture AI that auto-solves coding problems, real-time audio transcription, resume context, cheat sheets, and a practice room for developers.',
  alternates: { canonical: 'https://hirebotai.in/features' },
  openGraph: {
    title: 'Features — Screen Capture AI, Audio Transcription & More',
    description:
      'Screen Capture AI, audio transcription, resume context, cheat sheets and practice room — explore all Hirebotai features.',
    url: 'https://hirebotai.in/features',
  },
};

export default function FeaturesPage() {
  return <FeaturesPageClient />;
}