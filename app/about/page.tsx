import type { Metadata } from 'next';
import { PageLayout, ProseSection } from '@/components/content/PageLayout';

export const metadata: Metadata = {
  title: 'About Hirebotai — Engineering Interview Assistance Built in India',
  description:
    'Hirebotai is an AI interview assistant for developers, engineered in India. Learn about our mission, values and the team behind screen capture AI, audio transcription and stealth HUD.',
  alternates: { canonical: 'https://hirebotai.in/about' },
  openGraph: {
    title: 'About Hirebotai',
    description:
      'The team and mission behind Hirebotai — an AI interview assistant engineered in India.',
    url: 'https://hirebotai.in/about',
  },
};

export default function AboutPage() {
  return (
    <PageLayout
      badge="About Us"
      title="Engineered in India. Built for Ambitious Engineers Worldwide."
      subtitle="Hirebotai started with a simple idea: every developer deserves to perform at their best when it matters most."
      updatedAt="August 2026"
    >
      <ProseSection title="Our Mission">
        <p>
          Technical interviews are a game of timing, pressure and recall — not just raw ability.
          Hirebotai exists to level the playing field by giving developers a real-time AI assistant
          that captures the question, transcribes the interviewer, and delivers concise answers
          while you keep your eyes on the problem.
        </p>
        <p>
          We believe in building tools that respect how the modern developer actually works:
          fast, focused and under pressure. Our stealth HUD is designed to stay invisible to
          screen sharing so nothing interrupts your flow.
        </p>
      </ProseSection>

      <ProseSection title="What We Build">
        <p>
          Hirebotai is a Windows desktop application for developers preparing for technical
          interviews. It combines screen capture solving (vision AI), live audio transcription,
          resume context and a structured practice room into one assistant.
        </p>
        <ul className="list-disc list-inside space-y-2 text-surface-300">
          <li><strong className="text-white">Screen Capture AI</strong> — captures the problem on your screen and returns a solution in seconds.</li>
          <li><strong className="text-white">Real-Time Audio Transcription</strong> — hears the interviewer and transcribes questions live.</li>
          <li><strong className="text-white">Resume Context</strong> — grounds behavioral answers in your actual projects.</li>
          <li><strong className="text-white">Practice Room</strong> — mock interviews with scoring reports to build real confidence.</li>
        </ul>
      </ProseSection>

      <ProseSection title="Our Values">
        <ul className="list-disc list-inside space-y-2 text-surface-300">
          <li><strong className="text-white">Speed first.</strong> Answers in under 50ms of average AI latency.</li>
          <li><strong className="text-white">Stealth by design.</strong> A HUD that never appears on screen shares.</li>
          <li><strong className="text-white">1 PC, 1 license.</strong> Device-bound licensing keeps keys secure.</li>
          <li><strong className="text-white">Transparent pricing.</strong> Free trial, no credit card required.</li>
        </ul>
      </ProseSection>

      <ProseSection title="Get in Touch">
        <p>
          We read every email. Reach out to{' '}
          <a href="mailto:hello@hirebotai.in" className="text-brand-400 hover:underline">
            hello@hirebotai.in
          </a>{' '}
          for partnerships, press or product feedback.
        </p>
      </ProseSection>
    </PageLayout>
  );
}
