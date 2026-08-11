import type { Metadata } from 'next';
import { PageLayout } from '@/components/content/PageLayout';
import { Rocket, Wrench, Bug, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Changelog — Hirebotai Release Notes',
  description:
    'Every Hirebotai update: new features, hotkeys, fixes and improvements across Windows releases.',
  alternates: { canonical: 'https://hirebotai.in/changelog' },
  openGraph: {
    title: 'Changelog — Hirebotai Release Notes',
    description: 'All Hirebotai releases, features and fixes.',
    url: 'https://hirebotai.in/changelog',
  },
};

const releases = [
  {
    version: 'v1.17.8.26',
    date: 'August 2026',
    icon: Rocket,
    headline: 'First Production Release',
    items: [
      'Interview Mode with resume-based answers and code rendering in HUD.',
      'Resume language auto-detected and enforced in AI code responses.',
      'License and trial system with HWID binding and 12-hour revalidation.',
      'Live update banner via API notice system — admins can broadcast from dashboard.',
      'Windows installer with Start Menu, Desktop shortcuts, auto-start, and uninstaller.',
      'Engine and tray access fully gated — no bypass via direct launch.',
    ],
  },
  {
    version: 'v1.4.0',
    date: 'August 2026',
    icon: Sparkles,
    headline: 'Ghost Mode improvements & faster audio',
    items: [
      'Alt+T Ghost Mode now supports click-through on all Windows 11 builds.',
      'Audio transcription latency reduced to under 50ms on Groq.',
      'New visual onboarding flow for first-time users.',
    ],
  },
  {
    version: 'v1.3.2',
    date: 'July 2026',
    icon: Rocket,
    headline: 'Performance & stability',
    items: [
      'Reduced memory usage by 40% during long interview sessions.',
      'Faster screen capture on high-DPI displays.',
      'Fixed HUD flicker when switching virtual desktops.',
    ],
  },
  {
    version: 'v1.3.0',
    date: 'June 2026',
    icon: Sparkles,
    headline: 'Practice Room launch',
    items: [
      'New Practice Room with mock interview sessions and scoring reports.',
      'Resume context: behavioral answers grounded in your projects.',
      '2-second capture cooldown to protect against API rate limits.',
    ],
  },
  {
    version: 'v1.2.0',
    date: 'May 2026',
    icon: Wrench,
    headline: 'Stealth HUD hardening',
    items: [
      'HUD is now 100% invisible to Zoom, Google Meet, Teams and Discord shares.',
      'Added WDA_EXCLUDEFROMCAPTURE protection for all overlay windows.',
      'New Alt+H hotkey to hide or show the floating HUD instantly.',
    ],
  },
  {
    version: 'v1.1.0',
    date: 'April 2026',
    icon: Bug,
    headline: 'Audio listening & follow-ups',
    items: [
      'Alt+A toggles live audio listening with transcription.',
      'Alt+Q for context-aware follow-up questions on the current problem.',
      'Fixed a crash when switching API providers mid-session.',
    ],
  },
  {
    version: 'v1.0.0',
    date: 'March 2026',
    icon: Rocket,
    headline: 'Initial release',
    items: [
      'Screen Capture AI solving with OpenRouter and Gemini vision.',
      'Device-bound SA-XXXX-XXXX license keys (1 PC per license).',
      'Alt+S primary solve hotkey with instant HUD results.',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <PageLayout
      badge="Changelog"
      title="What's New in Hirebotai"
      subtitle="Release notes for every version, from the initial launch to the latest improvements."
      updatedAt="August 2026"
    >
      <div className="space-y-5">
        {releases.map((release) => (
          <div
            key={release.version}
            className="rounded-2xl border border-surface-800 bg-surface-900/50 backdrop-blur-sm p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-surface-900/80 border border-surface-700 flex items-center justify-center">
                <release.icon className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <span className="font-mono font-bold text-white">{release.version}</span>
                <span className="text-xs text-surface-500 ml-3">{release.date}</span>
              </div>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{release.headline}</h2>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-surface-400">
              {release.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
