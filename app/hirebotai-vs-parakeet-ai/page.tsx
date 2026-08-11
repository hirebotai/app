import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { Check, X, Minus, ArrowRight, EyeOff, Sparkles, FileText, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hirebotai vs Parakeet AI — Which Interview Assistant Is Better?',
  description:
    'Honest comparison of Hirebotai and Parakeet AI: coding interview support, stealth approach, practice room, pricing transparency, free trials and platform support. Based on publicly available information as of August 2026.',
  alternates: { canonical: 'https://hirebotai.in/hirebotai-vs-parakeet-ai' },
  openGraph: {
    title: 'Hirebotai vs Parakeet AI — Which Interview Assistant Is Better?',
    description:
      'Coding support, stealth, practice mode, pricing transparency and free trials — an honest side-by-side.',
    url: 'https://hirebotai.in/hirebotai-vs-parakeet-ai',
  },
};

const comparisonRows: {
  feature: string;
  hirebotai: { text: string; verdict: 'yes' | 'no' | 'neutral' };
  parakeet: { text: string; verdict: 'yes' | 'no' | 'neutral' };
}[] = [
  {
    feature: 'Platform',
    hirebotai: { text: 'Native Windows desktop app (Win 10 & 11)', verdict: 'neutral' },
    parakeet: { text: 'Browser-based on any OS + Mac desktop app + mobile browser', verdict: 'neutral' },
  },
  {
    feature: 'Screen-share stealth',
    hirebotai: {
      text: 'Desktop HUD with WDA_EXCLUDEFROMCAPTURE — invisible to Zoom, Meet & Teams shares',
      verdict: 'yes',
    },
    parakeet: {
      text: 'Browser overlay; published reviews note the process can appear in Task Manager/Activity Monitor without setup',
      verdict: 'neutral',
    },
  },
  {
    feature: 'Coding interview support',
    hirebotai: {
      text: 'Screen Capture AI (Alt+S) reads the problem off your screen and returns a solution',
      verdict: 'yes',
    },
    parakeet: {
      text: 'Screenshot feature with structured breakdown (approach, pseudocode, complexity, edge cases)',
      verdict: 'neutral',
    },
  },
  {
    feature: 'Practice mode',
    hirebotai: {
      text: 'Practice Room with timed mock interviews and scoring reports',
      verdict: 'yes',
    },
    parakeet: {
      text: 'Live-only; no mock interviews or question bank (per published reviews)',
      verdict: 'no',
    },
  },
  {
    feature: 'AI model choice',
    hirebotai: {
      text: 'Bring your own keys — OpenRouter, Gemini (vision) and Groq (audio)',
      verdict: 'yes',
    },
    parakeet: {
      text: 'Choose between GPT-5, GPT-4.1 and Claude 4.0 Sonnet',
      verdict: 'neutral',
    },
  },
  {
    feature: 'Pricing model',
    hirebotai: {
      text: 'Simple monthly, yearly and lifetime plans — prices listed publicly',
      verdict: 'yes',
    },
    parakeet: {
      text: 'Pay-per-use credits plus subscriptions; subscription prices load only after sign-up (per published reviews)',
      verdict: 'neutral',
    },
  },
  {
    feature: 'Free trial',
    hirebotai: { text: 'Free 24-hour trial — no credit card required', verdict: 'yes' },
    parakeet: { text: '10 free sessions of up to 10 minutes each', verdict: 'neutral' },
  },
  {
    feature: 'Phone interviews',
    hirebotai: { text: 'Not supported', verdict: 'no' },
    parakeet: { text: 'Supported via Google Voice and other call routing', verdict: 'yes' },
  },
  {
    feature: 'Languages',
    hirebotai: { text: 'English-first', verdict: 'neutral' },
    parakeet: { text: '52 languages (one per session)', verdict: 'yes' },
  },
];

const faq = [
  {
    q: 'Is Hirebotai or Parakeet AI better for coding interviews?',
    a: 'Hirebotai is built around live coding rounds: Alt+S captures the problem on your screen and returns a solution, and it ships with a Practice Room for timed mock sessions with scoring. Parakeet AI is stronger for behavioral and phone screens, where its transcription and suggested answers shine.',
  },
  {
    q: 'Which has more transparent pricing?',
    a: 'Hirebotai lists its plans publicly on the pricing page. Published third-party reviews of Parakeet AI note that its monthly and yearly subscription prices are not shown publicly and only load after you create an account.',
  },
  {
    q: 'Can both tools be used with Zoom, Google Meet and Microsoft Teams?',
    a: 'Yes. Both are designed to work alongside these platforms. Hirebotai uses a desktop overlay protected by WDA_EXCLUDEFROMCAPTURE; Parakeet AI runs as a browser overlay. Feature sets change frequently, so check each vendor\u2019s current documentation before relying on stealth in a live session.',
  },
];

export default function ComparisonPage() {
  return (
    <div className="min-h-screen bg-surface-950 text-surface-50 pt-10 pb-24 px-4 sm:px-6 lg:px-8">
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          },
        ]}
      />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="text-center space-y-4 mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono font-semibold uppercase tracking-wider">
            Comparison
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight">
            Hirebotai vs Parakeet AI
          </h1>
          <p className="max-w-2xl mx-auto text-surface-400 text-base leading-relaxed">
            Both tools give you real-time AI help during interviews. The differences that matter
            are in coding support, practice mode, stealth approach and how pricing works.
          </p>
          <p className="text-xs font-mono text-surface-500">
            Based on publicly available information as of August 2026. Verify current features and
            pricing on each vendor&apos;s website.
          </p>
        </header>

        {/* Quick verdict */}
        <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/10 via-surface-900/60 to-fuchsia-500/10 backdrop-blur-sm p-6 sm:p-8 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">The short answer</h2>
              <p className="text-surface-300 text-sm leading-relaxed">
                For <strong className="text-white">live coding rounds</strong> and developers who
                want preparation and support in one tool, <strong className="text-white">Hirebotai</strong> is
                the stronger choice — full screen-capture solving, a Practice Room with scoring,
                and public pricing. Parakeet AI is a solid pick for <strong className="text-white">occasional
                behavioral and phone screens</strong>, especially if you want browser-based access on any
                operating system.
              </p>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="mb-12 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="py-4 pr-4 text-surface-500 font-mono text-xs uppercase tracking-widest">Feature</th>
                <th className="py-4 pr-4 text-brand-400 font-mono text-xs uppercase tracking-widest">Hirebotai</th>
                <th className="py-4 text-surface-400 font-mono text-xs uppercase tracking-widest">Parakeet AI</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="border-b border-surface-800/60 align-top">
                  <td className="py-4 pr-4 font-semibold text-white whitespace-nowrap">{row.feature}</td>
                  <td className="py-4 pr-4">
                    <div className="flex items-start gap-2 text-surface-300">
                      <VerdictIcon verdict={row.hirebotai.verdict} />
                      <span>{row.hirebotai.text}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-start gap-2 text-surface-300">
                      <VerdictIcon verdict={row.parakeet.verdict} />
                      <span>{row.parakeet.text}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Why Hirebotai */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold font-mono text-white mb-6">Why developers choose Hirebotai</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-surface-800 bg-surface-900/50 backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <EyeOff className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-white">Desktop overlay stealth</h3>
              </div>
              <p className="text-sm text-surface-400 leading-relaxed">
                The HUD runs as a native desktop overlay protected by Windows
                WDA_EXCLUDEFROMCAPTURE — it does not live inside the interview browser tab and
                stays out of Zoom, Google Meet and Microsoft Teams shares.
              </p>
            </div>
            <div className="rounded-2xl border border-surface-800 bg-surface-900/50 backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-white">Solves from your screen</h3>
              </div>
              <p className="text-sm text-surface-400 leading-relaxed">
                Alt+S captures the coding problem directly off your screen and returns a solution
                through your own vision model — no manual copying or pasting required.
              </p>
            </div>
            <div className="rounded-2xl border border-surface-800 bg-surface-900/50 backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-white">Practice Room with scoring</h3>
              </div>
              <p className="text-sm text-surface-400 leading-relaxed">
                Timed mock interviews with detailed scoring reports — so you can fix your
                weaknesses before the real call instead of only getting help during it.
              </p>
            </div>
            <div className="rounded-2xl border border-surface-800 bg-surface-900/50 backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <Check className="w-5 h-5 text-green-400" />
                <h3 className="font-bold text-white">Public, simple pricing</h3>
              </div>
              <p className="text-sm text-surface-400 leading-relaxed">
                Monthly, yearly and lifetime plans are listed openly on the pricing page, with a
                free 24-hour trial that needs no credit card.
              </p>
            </div>
          </div>
        </section>

        {/* Where Parakeet wins */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold font-mono text-white mb-4">
            Where Parakeet AI has the edge
          </h2>
          <p className="text-surface-400 text-sm leading-relaxed mb-5">
            To be fair: Parakeet AI does some things genuinely well.
          </p>
          <ul className="list-disc list-inside space-y-2 text-surface-300 text-sm">
            <li>Runs in the browser, so it works on Windows, Mac, Linux and phones without an install.</li>
            <li>Handles phone interviews via Google Voice — something most desktop tools don&apos;t.</li>
            <li>Supports 52 languages, which is broader than most competitors.</li>
            <li>Pay-per-use credits can be cheaper if you only have one or two interviews.</li>
          </ul>
        </section>

        {/* Bottom line */}
        <section className="mb-12 rounded-2xl border border-surface-800 bg-surface-900/50 backdrop-blur-sm p-6 sm:p-8">
          <h2 className="text-2xl font-bold font-mono text-white mb-3">The bottom line</h2>
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-bold text-brand-400 mb-2">Pick Hirebotai if:</h3>
              <ul className="list-disc list-inside space-y-1.5 text-surface-300">
                <li>Coding rounds are the interviews that matter to you.</li>
                <li>You want practice + live support in one product.</li>
                <li>You prefer a Windows desktop app and public pricing.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-surface-300 mb-2">Pick Parakeet AI if:</h3>
              <ul className="list-disc list-inside space-y-1.5 text-surface-300">
                <li>Your interviews are mostly behavioral or phone screens.</li>
                <li>You need browser-based access on Mac, Linux or mobile.</li>
                <li>You want pay-per-use credits for occasional use.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold font-mono text-white mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {faq.map((item) => (
              <div key={item.q} className="rounded-2xl border border-surface-800 bg-surface-900/50 backdrop-blur-sm p-6">
                <h3 className="font-bold text-white mb-2">{item.q}</h3>
                <p className="text-sm text-surface-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/10 via-surface-900/60 to-fuchsia-500/10 backdrop-blur-sm p-8 text-center">
          <h2 className="text-xl font-bold font-mono text-white mb-2">Try Hirebotai free for 24 hours</h2>
          <p className="text-surface-400 text-sm max-w-md mx-auto mb-5">
            No credit card required. See the Practice Room and Screen Capture AI for yourself.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/download"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-500 text-surface-950 font-mono font-semibold text-sm hover:bg-brand-400 transition-colors shadow-glow"
            >
              Download for Windows
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-transparent border border-brand-500/50 text-brand-400 font-mono font-semibold text-sm hover:bg-brand-500/10 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerdictIcon({ verdict }: { verdict: 'yes' | 'no' | 'neutral' }) {
  if (verdict === 'yes') {
    return <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />;
  }
  if (verdict === 'no') {
    return <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
  }
  return <Minus className="w-4 h-4 text-surface-600 shrink-0 mt-0.5" />;
}
