'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ScrollReveal, StaggerContainer } from '@/components/animations';
import { Card, Button } from '@/components/ui';
import {
  Monitor, Mic, FileText, Brain, Shield, Keyboard,
  CheckCircle2, ArrowRight, Zap, Terminal, Crosshair, EyeOff
} from 'lucide-react';

const featureCategories = [
  {
    title: 'Core Capture & Solve',
    slug: 'capture',
    icon: Monitor,
    gradient: 'from-brand-500 to-fuchsia-500',
    features: [
      {
        title: 'Screen Capture AI',
        description: 'Instantly capture the active window — code editor, browser, terminal, or IDE. AI analyzes the screenshot and returns complete solutions.',
        details: ['Auto-detects language: Python, C++, Java, JS, Go, SQL', 'Submission-ready code only — no fluff', 'Works on LeetCode, CodeChef, Codeforces, HackerRank, GeeksforGeeks & all coding platforms', 'Any window: VS Code, IntelliJ, PyCharm, browser, terminal'],
        shortcut: 'Alt + S',
      },
      {
        title: 'Silent Background Capture',
        description: 'Capture and solve in background without showing the HUD. Answer cached for instant reveal when you need it.',
        details: ['Zero UI footprint during capture', 'Answer cached for instant reveal', 'Stays hidden from screen recorders'],
        shortcut: 'Alt + O',
      },
    ],
  },
  {
    title: 'Audio Intelligence',
    slug: 'audio',
    icon: Mic,
    gradient: 'from-fuchsia-500 to-pink-600',
    features: [
      {
        title: 'Dual-Channel Audio',
        description: 'WASAPI loopback captures interviewer audio from Zoom/Teams/Meet while your mic captures your voice. Both transcribed in real-time.',
        details: ['Interviewer: system audio loopback', 'Candidate: microphone input', 'Real-time Google Speech-to-Text', 'Speaker labels: [Interviewer] vs [You]'],
        shortcut: 'Alt + A',
      },
      {
        title: 'Interview Mode',
        description: 'AI listens to the interviewer and generates concise answers you can read aloud — in your own voice, using your resume context.',
        details: ['Answers as YOU (first-person POV)', '1-3 sentences max — natural delivery', 'Resume-aware: references your projects', 'Auto-restarts audio with context'],
        shortcut: 'Alt + I',
      },
    ],
  },
  {
    title: 'Context & Preparation',
    slug: 'context',
    icon: FileText,
    gradient: 'from-accent-green to-emerald-500',
    features: [
      {
        title: 'Resume Manager (3 Slots)',
        description: 'Upload up to 3 resumes and set one active. AI parses and injects your experience into every answer — projects, stack, metrics.',
        details: ['Drag & drop PDF or text', 'Auto-extracts text from PDF', 'Preview parsed content', 'One-click activate/deactivate'],
        shortcut: 'Dashboard',
      },
      {
        title: 'Cheat Sheet Overlay',
        description: 'Markdown cheat sheets rendered on the HUD. Big-O, code snippets, system design patterns, SQL queries. Auto-saves as you type.',
        details: ['Syntax-highlighted editor', 'Toggle overlay on HUD', 'Scroll with Alt+Up/Down', 'Persistent across sessions'],
        shortcut: 'Alt + N',
      },
    ],
  },
  {
    title: 'Practice & Improvement',
    slug: 'practice',
    icon: Brain,
    gradient: 'from-fuchsia-500 to-pink-600',
    features: [
      {
        title: 'Practice Room',
        description: 'Full mock interview simulator with Coding, System Design, and Behavioral modes. AI asks, you answer, get a scored report.',
        details: ['3 interview types × 3 difficulty levels', '1-30 questions per session', 'Verbal + Coding workspace tabs', 'Detailed scorecard with 1-10 scores'],
        shortcut: 'Alt + P',
      },
      {
        title: 'Session History & Analytics',
        description: 'Every capture, audio session, and practice run logged locally in SQLite. Searchable timeline. Export to PDF.',
        details: ['Filter by type: screen, audio, practice', 'Full transcripts with timestamps', 'PDF export with formatting', 'Scorecard history tracking'],
        shortcut: 'Dashboard',
      },
    ],
  },
  {
    title: 'Stealth & Reliability',
    slug: 'stealth',
    icon: Shield,
    gradient: 'from-red-500 to-rose-600',
    features: [
      {
        title: 'Ghost / Click-Through Mode',
        description: 'Toggle Windows Display Affinity. HUD becomes invisible to Zoom, Teams, Discord, OBS, and all screen recorders.',
        details: ['Windows Display Affinity API', 'Zero detection by screen sharing', 'Instant toggle', 'Persists across restarts'],
        shortcut: 'Alt + T',
      },
      {
        title: 'HUD Visibility Toggle',
        description: 'Alt+H: toggle HUD visibility instantly (open/close) — resizable, movable, scrollable, and stays on top.',
        details: ['Sticky: stays until dismissed', 'Quick open/close', 'Scroll long answers with shortcuts'],
        shortcut: 'Alt + H',
      },
      {
        title: 'Multi-Provider AI Failover',
        description: 'Groq for speed, OpenRouter for vision, Gemini for reasoning. Auto-failover on rate limits or errors. Bring your own keys.',
        details: ['Groq: llama-3.3-70b (text)', 'OpenRouter: llama-3.2-11b-vision', 'Gemini: gemini-2.0-flash (vision)', 'Smart routing: vision → OpenRouter/Gemini'],
        shortcut: 'Auto',
      },
      {
        title: 'Global Hotkeys',
        description: 'Full keyboard control without touching the mouse. Customizable in settings. Works globally — even in fullscreen apps.',
        details: ['Capture, audio, interview mode', 'Peek, sticky, cheat sheet', 'Ghost mode, silent activate', 'Customizable in settings'],
        shortcut: 'Custom',
      },
    ],
  },
];

const shortcuts = [
  { keys: 'Alt + S', action: 'Screen Capture & Solve', category: 'Core' },
  { keys: 'Alt + A', action: 'Toggle Audio Listening', category: 'Audio' },
  { keys: 'Alt + I', action: 'Toggle Interview Mode', category: 'Audio' },
  { keys: 'Alt + H', action: 'Hold to Peek Answer', category: 'HUD' },
  { keys: 'Alt + K', action: 'Sticky Keep Answer', category: 'HUD' },
  { keys: 'Alt + T', action: 'Ghost / Click-Through', category: 'Stealth' },
  { keys: 'Alt + N', action: 'Show Cheat Sheet', category: 'Prep' },
  { keys: 'Alt + O', action: 'Start Engine / Activate HUD', category: 'Core' },
  { keys: 'Alt + Q', action: 'Manual Input to AI', category: 'Core' },
  { keys: 'Alt + P', action: 'Open Practice Room', category: 'Practice' },
  { keys: 'Alt + ↑', action: 'Scroll Answer Up', category: 'HUD' },
  { keys: 'Alt + ↓', action: 'Scroll Answer Down', category: 'HUD' },
  { keys: 'Alt + E', action: 'Exit Engine', category: 'System' },
];

export function FeaturesPageClient() {
  return (
    <div className="min-h-screen bg-surface-950">
      <FeaturesHero />

      <nav className="sticky top-16 z-30 px-4 sm:px-6 lg:px-8 py-3 bg-surface-950/90 backdrop-blur-md border-y border-surface-800/80 mb-12">
        <div className="mx-auto max-w-7xl flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar py-1">
          {featureCategories.map((category, i) => (
            <a
              key={category.slug}
              href={`#${category.slug}`}
              className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-800 bg-surface-900/60 font-mono text-xs text-surface-300 hover:text-brand-300 hover:border-brand-500/40 hover:bg-surface-800/80 transition-all shadow-sm"
            >
              <span className="text-brand-400 font-bold">0{i + 1}</span>
              <span>{category.title}</span>
            </a>
          ))}
          <a
            href="#shortcuts"
            className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-800 bg-surface-900/60 font-mono text-xs text-surface-300 hover:text-brand-300 hover:border-brand-500/40 hover:bg-surface-800/80 transition-all shadow-sm"
          >
            <span className="text-brand-400 font-bold">06</span>
            <span>Hotkeys</span>
          </a>
        </div>
      </nav>

      <main className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-7xl space-y-20">
          {featureCategories.map((category, catIndex) => (
            <FeatureCategorySection key={category.slug} category={category} catIndex={catIndex} />
          ))}

          <ShortcutsSection />

          <CTASection />
        </div>
      </main>
    </div>
  );
}

function FeatureCategorySection({ category, catIndex }: { category: typeof featureCategories[0]; catIndex: number }) {
  return (
    <section id={category.slug} className="scroll-mt-28">
      <ScrollReveal direction="up">
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-11 h-11 flex-shrink-0 rounded-lg bg-gradient-to-br ${category.gradient} flex items-center justify-center shadow-lg shadow-brand-500/25`}>
            <category.icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white truncate">{category.title}</h2>
            <p className="text-sm text-surface-500 font-mono">{String(catIndex + 1).padStart(2, '0')} / 0{featureCategories.length}</p>
          </div>
          <span className="ml-auto hidden sm:inline-flex font-mono text-xs uppercase tracking-[0.2em] text-surface-600 border border-surface-800 rounded-md px-3 py-1.5">
            {category.features.length} {category.features.length === 1 ? 'feature' : 'features'}
          </span>
        </div>
      </ScrollReveal>

      <StaggerContainer staggerDelay={0.08} direction="up" className="grid md:grid-cols-2 gap-5">
        {category.features.map((feature, featIndex) => (
          <FeatureDetailCard key={feature.title} feature={feature} index={catIndex * 10 + featIndex} categoryGradient={category.gradient} />
        ))}
      </StaggerContainer>
    </section>
  );
}

function FeatureDetailCard({ feature, index, categoryGradient }: { feature: typeof featureCategories[0]['features'][0]; index: number; categoryGradient: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <Card variant="default" hover className="group relative overflow-hidden h-full p-6 flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
          <h3 className="font-display text-lg font-bold text-white leading-snug">{feature.title}</h3>
          <ShortcutBadge shortcut={feature.shortcut} />
        </div>

        <p className="relative z-10 text-sm text-surface-400 leading-relaxed mb-6">{feature.description}</p>

        <ul className="relative z-10 mt-auto grid sm:grid-cols-2 gap-x-6 gap-y-2.5 pt-6 border-t border-surface-800/80">
          {feature.details.map((detail, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-surface-300">
              <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${categoryGradient.includes('accent-green') ? 'text-accent-green' : 'text-brand-400'}`} />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </Card>
    </motion.div>
  );
}

function ShortcutBadge({ shortcut }: { shortcut: string }) {
  const isCustom = shortcut === 'Dashboard' || shortcut === 'Auto' || shortcut === 'Custom';
  return isCustom ? (
    <span className="flex-shrink-0 px-2.5 py-1 rounded-md bg-surface-800/80 border border-surface-700 text-surface-400 font-mono text-[11px] uppercase tracking-wider">
      {shortcut}
    </span>
  ) : (
    <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-md bg-surface-800/80 border border-surface-700 px-2 py-1 font-mono text-[11px] text-brand-300">
      {shortcut.split(' + ').map((key, i, arr) => (
        <React.Fragment key={key}>
          {i > 0 && <span className="text-surface-600">+</span>}
          <kbd className="bg-surface-900 border border-surface-700 rounded px-1.5 py-0.5 text-brand-300">{key}</kbd>
        </React.Fragment>
      ))}
    </span>
  );
}

function ShortcutsSection() {
  return (
    <section id="shortcuts" className="scroll-mt-28">
      <ScrollReveal direction="up">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-11 h-11 flex-shrink-0 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
            <Keyboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">Global Hotkeys</h2>
            <p className="text-sm text-surface-500 font-mono">full keyboard control. no mouse needed.</p>
          </div>
        </div>
      </ScrollReveal>

      <StaggerContainer staggerDelay={0.04} direction="up" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.keys}
            className="flex items-center gap-3 p-4 rounded-lg bg-surface-900/50 border border-surface-800 hover:border-brand-500/30 transition-colors"
          >
            <div className="flex-shrink-0 inline-flex items-center gap-1">
              {shortcut.keys.split(' + ').map((key, i, arr) => (
                <React.Fragment key={key}>
                  {i > 0 && <span className="text-surface-600 text-xs">+</span>}
                  <kbd className="px-1.5 py-1 rounded-md bg-surface-800 border border-surface-700 border-b-2 font-mono text-xs text-brand-300">
                    {key}
                  </kbd>
                </React.Fragment>
              ))}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-surface-300 truncate">{shortcut.action}</p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-surface-600">{shortcut.category}</p>
            </div>
          </div>
        ))}
      </StaggerContainer>
    </section>
  );
}

function CTASection() {
  return (
    <ScrollReveal direction="up" className="mt-4 text-center">
      <div className="rounded-2xl bg-gradient-to-br from-brand-500/10 via-surface-900/60 to-fuchsia-500/10 border border-brand-500/30 p-12 lg:p-14">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to Experience It?
        </h2>
        <p className="text-surface-400 text-lg mb-8 max-w-xl mx-auto">
          Download the free 24-hour trial. No credit card. Full Pro access.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/download" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-brand-500 text-surface-950 font-mono font-semibold hover:bg-brand-400 transition-all shadow-glow hover:shadow-glow-lg"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </a>
          <a href="/pricing" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-8 py-4 rounded-lg border border-brand-500/40 text-brand-300 font-mono font-medium hover:bg-brand-500/10 hover:border-brand-500 transition-colors"
            >
              View Pricing
            </motion.button>
          </a>
        </div>
      </div>
    </ScrollReveal>
  );
}

function FeaturesHero() {
  const hudLines = [
    { type: 'ok', text: '✓ interview detected — zoom: acme systems' },
    { type: 'out', text: '> reading question via alt+s ...' },
    { type: 'out', text: '> "trapping rain water (hard)"' },
    { type: 'ok', text: '✓ answer generated · groq 38ms' },
    { type: 'code', text: 'def trap(height):' },
    { type: 'code', text: '    l, r, w = 0, len(height)-1, 0' },
    { type: 'code', text: '    lm = rm = 0' },
    { type: 'code', text: '    while l <= r:  # O(n) time, O(1) space' },
    { type: 'code', text: '        if height[l] <= height[r]:' },
    { type: 'code', text: '            lm = max(lm, height[l])' },
    { type: 'code', text: '            w += lm - height[l]; l += 1' },
    { type: 'code', text: '        else: rm = max(rm, height[r])' },
    { type: 'code', text: '    w += rm - height[r]; r -= 1' },
    { type: 'ok', text: '✓ pinned to HUD — alt+h · ghost: ON' },
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,229,255,0.10),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,0,200,0.08),transparent_55%)]" />
      <div className="absolute inset-0 scanlines opacity-60" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <ScrollReveal direction="up">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-surface-900/70 border border-brand-500/30 font-mono text-xs text-brand-400 mb-8">
                <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                complete feature breakdown
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
                Every Feature. <span className="text-gradient">Zero Detection.</span>
              </h1>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.2}>
              <p className="text-lg text-surface-400 max-w-xl mb-10 leading-relaxed">
                5 categories of capture, audio, stealth, and practice tools — built for technical interviews where every second counts.
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <a href="/download">
                  <Button size="xl" icon={<Zap className="w-5 h-5" />} className="w-full sm:w-auto">
                    start free trial
                  </Button>
                </a>
                <a href="/pricing">
                  <Button
                    variant="outline"
                    size="xl"
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                    className="w-full sm:w-auto whitespace-nowrap"
                  >
                    view pricing
                  </Button>
                </a>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.4}>
              <div className="flex flex-wrap items-center gap-6 font-mono text-xs text-surface-500">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent-green" />
                  invisible to zoom / teams / discord
                </span>
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-fuchsia-400" />
                  &lt;50ms latency
                </span>
                <span className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-brand-400" />
                  13 global hotkeys
                </span>
              </div>
            </ScrollReveal>
          </div>

          <div className="relative px-2 sm:px-4 pb-16 pt-6">
            <div className="absolute -inset-10 bg-[radial-gradient(ellipse_at_center,rgba(0,229,255,0.14),transparent_60%)] -z-10" />

            <div className="rounded-2xl border border-surface-800 bg-surface-900/70 backdrop-blur-sm overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-800 bg-surface-950/80">
                <span className="w-2 h-2 rounded-full bg-red-500/80" />
                <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                <span className="w-2 h-2 rounded-full bg-green-400/80" />
                <span className="ml-3 font-mono text-xs text-surface-500">interview — acme systems</span>
                <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
                </span>
              </div>
              <div className="grid grid-cols-[1fr_92px] gap-3 p-4">
                <div className="rounded-xl border border-surface-800 bg-gradient-to-br from-surface-800/80 to-surface-900 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500/40 to-brand-500/40 border border-brand-500/30 flex items-center justify-center font-mono text-sm font-bold text-white">
                      AZ
                    </div>
                    <div>
                      <div className="font-mono text-xs text-surface-200">aarav — senior sde</div>
                      <div className="font-mono text-[10px] text-surface-600">asked via zoom</div>
                    </div>
                  </div>
                  <p className="font-mono text-[13px] text-surface-300 leading-relaxed">
                    "you have an array of heights. <span className="text-brand-400">how would you</span> compute trapped
                    rainwater in linear time?"
                  </p>
                </div>
                <div className="rounded-xl border border-surface-800 bg-surface-950 flex flex-col items-center justify-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center font-mono text-[10px] text-brand-300">
                    you
                  </div>
                  <div className="font-mono text-[9px] text-surface-600">cam off</div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="absolute right-0 sm:right-2 -bottom-2 w-[84%] animate-float"
            >
              <div className="rounded-2xl border border-brand-500/40 bg-surface-950/95 backdrop-blur-md shadow-glow-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-brand-500/20 bg-brand-500/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                  <span className="font-mono text-[11px] text-brand-300">hirebotai hud — ghost: ON</span>
                  <span className="ml-auto font-mono text-[10px] text-surface-600 hidden sm:inline">alt+h sticky</span>
                </div>
                <div className="p-4 font-mono text-[11.5px] leading-relaxed space-y-0.5 overflow-hidden">
                  {hudLines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.12 }}
                      className="whitespace-pre-wrap"
                    >
                      {line.type === 'ok' && <span className="text-accent-green">{line.text}</span>}
                      {line.type === 'out' && <span className="text-surface-400">{line.text}</span>}
                      {line.type === 'code' && <span className="text-cyan-300/90">{line.text}</span>}
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 + hudLines.length * 0.12 + 0.3 }}
                  >
                    <span className="inline-block w-2 h-4 bg-brand-400 align-middle animate-blink" />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 }}
              className="absolute -left-2 top-10 hidden sm:block"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900/90 border border-accent-green/40 font-mono text-[11px] text-accent-green shadow-glow backdrop-blur-sm">
                <EyeOff className="w-3.5 h-3.5" />
                hidden from screen share
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 }}
              className="absolute bottom-6 left-0 hidden sm:block"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900/90 border border-brand-500/40 font-mono text-[11px] text-brand-300 shadow-glow backdrop-blur-sm">
                <Crosshair className="w-3.5 h-3.5" />
                alt+s capture &amp; solve
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
