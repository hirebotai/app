import type { Metadata } from 'next';
import Link from 'next/link';
import { PageLayout } from '@/components/content/PageLayout';
import { FileText, Keyboard, KeyRound, Download, LifeBuoy, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Documentation — Hirebotai Setup, Activation & Usage',
  description:
    'Official Hirebotai documentation: installation, license activation, API key setup, full hotkey reference, stealth HUD and troubleshooting.',
  alternates: { canonical: 'https://hirebotai.in/docs' },
  openGraph: {
    title: 'Documentation — Hirebotai Setup, Activation & Usage',
    description:
      'Official Hirebotai docs for installation, license activation, API keys and hotkeys.',
    url: 'https://hirebotai.in/docs',
  },
};

const docSections = [
  {
    icon: Download,
    title: 'Installation',
    description:
      'Download the Windows installer, launch Hirebotai.exe and start your free 24-hour trial. Works on Windows 10 & 11.',
    link: '/download',
    linkLabel: 'Download the app',
  },
  {
    icon: KeyRound,
    title: 'License Activation',
    description:
      'Licenses are device-bound (1 PC). Sign in to your account dashboard to view your key, then enter it in the app to activate.',
    link: '/dashboard',
    linkLabel: 'Go to your dashboard',
  },
  {
    icon: Sparkles,
    title: 'API Keys',
    description:
      'Add an OpenRouter or Gemini key for vision screen captures and a Groq key for audio. Store keys in the app\u2019s API Keys page.',
    link: '/support',
    linkLabel: 'API key help',
  },
  {
    icon: Keyboard,
    title: 'Hotkey Reference',
    description:
      'Alt+S to solve on screen, Alt+Q for follow-ups, Alt+A to toggle audio listening, Alt+C to clear chat, Alt+H to hide the HUD and Alt+T for ghost mode.',
    link: '/instructions',
    linkLabel: 'Full hotkey guide',
  },
  {
    icon: FileText,
    title: 'Stealth HUD & Screen Shares',
    description:
      'The floating HUD uses Windows WDA_EXCLUDEFROMCAPTURE so it never appears in Zoom, Google Meet, Microsoft Teams or Discord shares.',
    link: '/features',
    linkLabel: 'See how it works',
  },
  {
    icon: LifeBuoy,
    title: 'Troubleshooting',
    description:
      'Screen capture not solving? Audio not transcribing? Check the support FAQ and troubleshooting guides before contacting us.',
    link: '/support',
    linkLabel: 'Visit support',
  },
];

export default function DocsPage() {
  return (
    <PageLayout
      badge="Documentation"
      title="Hirebotai Documentation"
      subtitle="Everything you need to install, activate and get the most out of Hirebotai."
      updatedAt="August 2026"
    >
      <div className="grid sm:grid-cols-2 gap-5">
        {docSections.map((section) => (
          <div
            key={section.title}
            className="group rounded-2xl border border-surface-800 bg-surface-900/50 backdrop-blur-sm p-6 hover:border-brand-500/40 hover:shadow-glow transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-900/80 border border-surface-700 flex items-center justify-center mb-4">
              <section.icon className="w-5 h-5 text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{section.title}</h2>
            <p className="text-sm text-surface-400 leading-relaxed mb-4">{section.description}</p>
            <Link
              href={section.link}
              className="text-sm font-mono text-brand-400 hover:underline"
            >
              {section.linkLabel} →
            </Link>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
