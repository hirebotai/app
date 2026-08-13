'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Shield, Zap, Cpu, Sparkles, Terminal, ArrowRight, Monitor, Command } from 'lucide-react';
import { Button } from '@/components/ui';
import { ScrollReveal, StaggerContainer, Magnetic } from '@/components/animations';

const stats = [
  { value: '24h', label: 'free trial', accent: 'text-brand-400' },
  { value: '100%', label: 'invisible to screen share', accent: 'text-accent-green' },
  { value: '<50ms', label: 'ai response latency', accent: 'text-fuchsia-400' },
  { value: '8+', label: 'global hotkeys', accent: 'text-amber-400' },
];

function trackWindowsDownload() {
  const body = JSON.stringify({ platform: 'windows' });
  if (navigator.sendBeacon('/api/track-download', new Blob([body], { type: 'application/json' }))) {
    return;
  }

  fetch('/api/track-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

const conversationScript = [
  // Question 1: Basic Programming Concepts (Fresher Level)
  { id: 'q1-i', role: 'interviewer', label: '[Interviewer]', text: 'What is the difference between Process and Thread?' },
  { id: 'q1-a', role: 'ai', label: '💡 [AI Suggestion]', text: 'Process has independent memory; threads share memory within the same process.' },
  { id: 'q1-y', role: 'you', label: '[You]', text: 'A process has its own dedicated memory space, while threads share memory within a process.' },
  
  // Question 2: Object-Oriented Programming (Fresher Level)
  { id: 'q2-i', role: 'interviewer', label: '[Interviewer]', text: 'What is Method Overloading vs Overriding in OOP?' },
  { id: 'q2-a', role: 'ai', label: '💡 [AI Suggestion]', text: 'Overloading is same class with different parameters. Overriding is redefining in subclass.' },
  { id: 'q2-y', role: 'you', label: '[You]', text: 'Overloading happens in the same class with different signatures; overriding redefines a parent method in a child class.' },
];

function TypewriterText({ text, speed = 18, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayed(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return <span>{displayed}</span>;
}

function LiveConversationBox() {
  const [lineIndex, setLineIndex] = useState(0);

  const handleNextLine = () => {
    if (lineIndex < conversationScript.length - 1) {
      setTimeout(() => setLineIndex((prev) => prev + 1), 500);
    } else {
      setTimeout(() => setLineIndex(0), 3000);
    }
  };

  // Keep max 3 visible lines to prevent box expansion
  const visibleLines = conversationScript.slice(Math.max(0, lineIndex - 2), lineIndex + 1);

  return (
    <div className="terminal relative overflow-hidden rounded-2xl border border-surface-800 bg-surface-900/80 backdrop-blur-md shadow-2xl h-[360px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-800 bg-surface-950/90">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        <span className="ml-3 font-mono text-xs text-surface-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          hirebotai — live interview HUD
        </span>
      </div>
      
      <div className="p-5 font-mono text-sm space-y-3.5 h-[300px] overflow-y-auto no-scrollbar flex flex-col justify-start">
        {visibleLines.map((item) => {
          const isCurrent = conversationScript[lineIndex]?.id === item.id;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`p-3 rounded-lg border text-left ${
                item.role === 'interviewer'
                  ? 'bg-surface-950/60 border-surface-800 text-surface-100'
                  : item.role === 'ai'
                  ? 'bg-brand-500/10 border-brand-500/30 text-white shadow-glow'
                  : 'bg-accent-green/10 border-accent-green/30 text-accent-green'
              }`}
            >
              <div className="text-[11px] font-bold tracking-wide uppercase mb-1 opacity-80">
                {item.label}
              </div>
              <div className="text-xs sm:text-sm font-sans font-medium leading-relaxed">
                {isCurrent ? (
                  <TypewriterText text={item.text} speed={18} onComplete={handleNextLine} />
                ) : (
                  <span>{item.text}</span>
                )}
                {isCurrent && <span className="inline-block w-1.5 h-4 bg-brand-400 ml-1 animate-blink align-middle" />}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="absolute -top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />
      <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-brand-500/20 to-fuchsia-500/20 -z-10 blur-xl opacity-60" />
    </div>
  );
}

function FloatingChip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.2 }}
      className={`absolute z-10 hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900/90 border border-brand-500/40 font-mono text-xs text-surface-200 shadow-glow backdrop-blur-sm ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function HeroSection() {
  const [showOsModal, setShowOsModal] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,229,255,0.10),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,0,200,0.08),transparent_55%)]" />
      <div className="absolute inset-0 scanlines opacity-60" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-16 lg:pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div>
            <ScrollReveal direction="up">
              <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-surface-900/70 border border-brand-500/30 font-mono text-xs text-brand-400 mb-5">
                <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                stealth ai interview copilot
                <span className="text-surface-600">v1.0.0</span>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.1}>
              <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.04] mb-5">
                <span className="text-white">Ace your</span>{' '}
                <span className="text-gradient">technical</span>
                <br />
                <span className="text-white">interviews — </span>
                <span className="text-white relative">
                  invisibly
                  <span className="absolute -bottom-1.5 left-0 w-full h-[3px] bg-gradient-to-r from-brand-400 via-fuchsia-400 to-brand-400 rounded-full shadow-glow" />
                </span>
                .
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2}>
              <p className="text-base sm:text-lg text-surface-400 max-w-xl mb-6 leading-relaxed">
                Screen capture AI, live audio transcription, resume context, and cheat sheets — rendered in a HUD that's
                <span className="text-accent-green font-medium"> invisible to screen sharing</span>.
              </p>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 mb-7">
                <Magnetic>
                  <Button size="lg" icon={<Download className="w-4 h-4" />} className="w-full sm:w-auto" onClick={() => setShowOsModal(true)}>
                    Download App
                  </Button>
                </Magnetic>
                <a href="/download#activation">
                  <Button
                    variant="outline"
                    size="lg"
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                    className="w-full sm:w-auto"
                  >
                    Activate License
                  </Button>
                </a>
              </div>

              {/* OS Selection Modal */}
              {showOsModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowOsModal(false)}>
                  <div className="bg-surface-900 border border-brand-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl animate-in fade-in zoom-in" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono text-xl font-bold text-white">Choose Operating System</h3>
                      <button onClick={() => setShowOsModal(false)} className="text-surface-400 hover:text-white text-lg">✕</button>
                    </div>
                    <p className="text-sm text-surface-400">Select your platform to download the Hirebotai installer.</p>

                    <div className="space-y-3">
                      <a href={process.env.NEXT_PUBLIC_DOWNLOAD_URL || 'https://hirebotai.in/api/download/windows'} onClick={() => { trackWindowsDownload(); setShowOsModal(false); }} className="flex items-center justify-between p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-brand-400 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
                            <Monitor className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-white group-hover:text-brand-300">Windows 10 / 11</div>
                            <div className="text-xs text-surface-400">Standard 64-bit Setup (.zip)</div>
                          </div>
                        </div>
                        <Download className="w-5 h-5 text-brand-400" />
                      </a>

                      <a href="#" onClick={(e) => { e.preventDefault(); setShowOsModal(false); window.location.href = '/download'; }} className="flex items-center justify-between p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-brand-400 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                            <Command className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-white group-hover:text-brand-300">macOS (Apple &amp; Intel)</div>
                            <div className="text-xs text-surface-400">Installer Disk Image (.dmg)</div>
                          </div>
                        </div>
                        <Download className="w-5 h-5 text-surface-400 group-hover:text-brand-400" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.4}>
              <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 font-mono text-[11px] sm:text-xs text-surface-500 whitespace-nowrap">
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <Shield className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />
                  invisible to zoom / teams / discord
                </span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <Cpu className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                  groq + openrouter + gemini
                </span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <Zap className="w-3.5 h-3.5 text-fuchsia-400 flex-shrink-0" />
                  &lt;50ms latency
                </span>
              </div>
            </ScrollReveal>
          </div>

          <div className="relative self-start lg:mt-2">
            <FloatingChip className="-top-4 -right-2 lg:-right-6">
              <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
              &lt;50ms latency
            </FloatingChip>
            <FloatingChip className="top-1/3 -left-3 lg:-left-8">
              <Shield className="w-3.5 h-3.5 text-accent-green" />
              100% invisible
            </FloatingChip>
            <FloatingChip className="-bottom-4 left-1/4">
              <Terminal className="w-3.5 h-3.5 text-brand-400" />
              alt+s → capture &amp; solve
            </FloatingChip>

            <ScrollReveal direction="up" delay={0.2}>
              <div className="animate-float">
                <LiveConversationBox />
              </div>
            </ScrollReveal>
          </div>
        </div>

        <StaggerContainer staggerDelay={0.1} direction="up" className="mt-24 border-t border-white/10 pt-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-3 lg:justify-center">
                <span className={`font-mono text-3xl font-bold ${stat.accent}`}>{stat.value}</span>
                <span className="font-mono text-xs uppercase tracking-wider text-surface-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </StaggerContainer>
      </div>
    </section>
  );
}
