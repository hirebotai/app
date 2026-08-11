import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/Toast';
import { JsonLd } from '@/components/seo/JsonLd';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap', weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://hirebotai.in'),
  title: {
    default: 'Hirebotai — AI Interview Assistant for Developers',
    template: '%s | Hirebotai',
  },
  description: 'Ace your technical interviews with Hirebotai. Screen capture AI, real-time audio transcription, resume context, cheat sheets — all invisible to screen sharing.',
  keywords: ['AI interview assistant', 'technical interview prep', 'coding interview help', 'screen capture AI', 'audio transcription', 'developer tools'],
  authors: [{ name: 'Hirebotai' }],
  creator: 'Hirebotai',
  publisher: 'Hirebotai',
  robots: 'index, follow',
  alternates: {
    canonical: 'https://hirebotai.in/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hirebotai.in',
    siteName: 'Hirebotai',
    title: 'Hirebotai — AI Interview Assistant for Developers',
    description: 'Ace your technical interviews with Hirebotai. Screen capture AI, real-time audio transcription, resume context, cheat sheets.',
    images: [
      {
        url: 'https://hirebotai.in/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Hirebotai - AI Interview Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hirebotai — AI Interview Assistant',
    description: 'Ace your technical interviews with screen capture AI, audio transcription, and real-time answers.',
    images: ['https://hirebotai.in/og-image.png'],
    creator: '@hirebotai',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
        <link rel="icon" href="/tab-icon.png" type="image/png" sizes="512x512 256x256 128x128 64x64 32x32" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/tab-icon.png" sizes="180x180" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-surface-950 text-surface-50 min-h-screen flex flex-col">
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Hirebotai',
              url: 'https://hirebotai.in',
              logo: 'https://hirebotai.in/logo.png',
              email: 'hello@hirebotai.in',
              sameAs: [
                'https://twitter.com/hirebotai',
                'https://github.com/hirebotai',
                'https://discord.gg/hirebotai',
              ],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Hirebotai',
              url: 'https://hirebotai.in',
            },
          ]}
        />
        <Header />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}