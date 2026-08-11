import { Metadata } from 'next';
import { DownloadPageClient } from './DownloadPageClient';

export const metadata: Metadata = {
  title: 'Download Hirebotai for Windows — Free 24-Hour Trial',
  description:
    'Download Hirebotai for Windows and start your free 24-hour trial instantly. No credit card required. Windows 10 & 11 supported.',
  alternates: { canonical: 'https://hirebotai.in/download' },
  openGraph: {
    title: 'Download Hirebotai for Windows — Free 24-Hour Trial',
    description:
      'Download Hirebotai for Windows and start your free 24-hour trial instantly. No credit card required.',
    url: 'https://hirebotai.in/download',
  },
};

export default function DownloadPage() {
  return <DownloadPageClient />;
}
