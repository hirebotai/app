'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ScrollReveal, StaggerContainer } from '@/components/animations';
import { Card } from '@/components/ui';
import { 
  Monitor, 
  Mic, 
  FileText, 
  Keyboard, 
  Brain, 
  Shield, 
  Zap, 
  Eye,
  Layers,
  Terminal,
  Globe
} from 'lucide-react';

const features = [
  {
    icon: Monitor,
    title: 'Screen Capture AI',
    description: 'Press Alt+S to capture the active window. AI analyzes code, MCQs, diagrams, and errors — returns solution in <2s.',
    shortcut: 'Alt + S',
    gradient: 'from-brand-500 to-fuchsia-500',
    href: '/features#capture',
  },
  {
    icon: Mic,
    title: 'Dual-Channel Audio',
    description: 'WASAPI loopback captures interviewer audio; mic captures yours. Real-time transcription + AI answers — invisible to all.',
    shortcut: 'Alt + A',
    gradient: 'from-fuchsia-500 to-pink-600',
    href: '/features#audio',
  },
  {
    icon: FileText,
    title: 'Resume Context',
    description: 'Upload your resume (PDF/txt). AI answers questions as YOU — referencing your projects, stack, and experience authentically.',
    shortcut: 'Auto',
    gradient: 'from-accent-green to-brand-600',
    href: '/features#context',
  },
  {
    icon: Keyboard,
    title: 'Cheat Sheet Overlay',
    description: 'Press Alt+N to overlay Markdown cheat sheets on the HUD. Big-O, snippets, system design patterns — always a glance away.',
    shortcut: 'Alt + N',
    gradient: 'from-amber-500 to-orange-600',
    href: '/features#practice',
  },
  {
    icon: Brain,
    title: 'Practice Room',
    description: 'Mock interviews with AI interviewer. Technical, System Design, Behavioral modes. Get scored report with strengths/weaknesses.',
    shortcut: 'Alt + P',
    gradient: 'from-rose-500 to-red-600',
    href: '/features#practice',
  },
  {
    icon: Shield,
    title: 'Ghost/Stealth Mode',
    description: 'Alt+T toggles click-through. HUD becomes invisible to screen capture (WDA_EXCLUDEFROMCAPTURE). Zero detection risk.',
    shortcut: 'Alt + T',
    gradient: 'from-red-500 to-rose-600',
    href: '/features#stealth',
  },
  {
    icon: Zap,
    title: 'Multi-Provider AI',
    description: 'Groq (speed), OpenRouter (vision), Gemini (reasoning). Auto-failover. No single point of failure. Bring your own keys.',
    shortcut: 'Auto',
    gradient: 'from-brand-600 to-accent-green',
    href: '/features#capture',
  },
  {
    icon: Terminal,
    title: 'Session History',
    description: 'Every capture, audio session, and practice run logged locally. Searchable, exportable to PDF. Build your interview portfolio.',
    shortcut: 'Auto',
    gradient: 'from-slate-500 to-gray-600',
    href: '/features#shortcuts',
  },
];

export function FeaturesPreview() {
  return (
    <section id="features" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-surface-950/50">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-md bg-brand-500/10 border border-brand-500/30 font-mono text-xs uppercase tracking-[0.2em] text-brand-400 mb-4">
              Core Features
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
              Everything You Need to{' '}
              <span className="text-gradient">Dominate Interviews</span>
            </h2>
            <p className="text-lg text-surface-400 max-w-2xl mx-auto">
              Eight powerful features designed by engineers, for engineers. No fluff — just what works.
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.08} direction="up" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <ScrollReveal key={feature.title} direction="up" delay={0.2 + i * 0.05}>
              <FeatureCard feature={feature} index={i} />
            </ScrollReveal>
          ))}
        </StaggerContainer>

        <ScrollReveal direction="up" delay={0.6} className="mt-16 text-center">
          <motion.a
            href="/features"
            className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium transition-colors group"
            whileHover={{ x: 4 }}
          >
            View All Features & Deep Dives
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.a>
        </ScrollReveal>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <a href={feature.href} className="block h-full cursor-pointer">
      <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="h-full"
      >
        <Card variant="default" hover padding="lg" className="h-full group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6 shadow-lg shadow-brand-500/25`}>
              <feature.icon className="w-7 h-7 text-white" />
            </div>

            <h3 className="font-display text-xl font-bold text-white mb-3 group-hover:text-brand-300 transition-colors">{feature.title}</h3>
            <p className="text-surface-400 text-sm leading-relaxed mb-6">{feature.description}</p>
          </div>

          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-surface-800 mt-auto">
            <span className="px-3 py-1 rounded-full bg-surface-800/50 border border-surface-700 text-surface-400 text-xs font-mono font-medium">
              {feature.shortcut}
            </span>
            <motion.div
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 flex items-center justify-center shadow-glow group-hover:scale-110 transition-all"
              animate={{ scale: hovered ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </a>
  );
}