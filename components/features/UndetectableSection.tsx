'use client';

import { motion } from 'framer-motion';
import { ScrollReveal, StaggerContainer } from '@/components/animations';
import { Card } from '@/components/ui';
import { Ghost, EyeOff, MonitorSmartphone, Lock, ShieldCheck, Check, X } from 'lucide-react';

const stealthModes = [
  {
    icon: MonitorSmartphone,
    title: 'Screen Shares',
    description:
      'Completely invisible in Zoom, Google Meet and Microsoft Teams screen shares. Interviewers see only your screen — never Hirebotai.',
    accent: 'text-brand-400',
  },
  {
    icon: EyeOff,
    title: 'Coding Assessments',
    description:
      'Works undetected inside proctored environments like CoderPad, HackerRank, LeetCode and CodeSignal. No window, no hints, no traces.',
    accent: 'text-fuchsia-400',
  },
  {
    icon: Lock,
    title: 'Restricted Browsers',
    description:
      'No browser extension and no install footprint, so it survives locked-down corporate browsers and locked exam environments.',
    accent: 'text-amber-400',
  },
  {
    icon: Ghost,
    title: 'System Recorders',
    description:
      'No taskbar entry, no Alt+Tab window, no screen-recorder overlay. Ghost mode leaves nothing for window managers or recorders to catch.',
    accent: 'text-green-400',
  },
];

const platforms = [
  'Zoom',
  'Google Meet',
  'Microsoft Teams',
  'Webex',
  'GoToMeeting',
  'BlueJeans',
  'Whereby',
  'Discord',
  'Skype',
  'Amazon Chime',
  'CoderPad',
  'HackerRank',
  'LeetCode',
  'CodeSignal',
  'HackerEarth',
  'CodeChef',
  'Codeforces',
  'AtCoder',
  'GeeksforGeeks',
  'Pramp',
  'Karat',
  'Qualified',
  'Xobin',
  'Codility',
  'TestDome',
  'TestGorilla',
  'InterviewBit',
  'iMocha',
  'Wheebox',
  'HireVue',
  'Vervoe',
  'DevSkiller',
  'Mettl',
  'ProctorU',
  'Proctorio',
  'Honorlock',
  'Respondus LockDown Browser',
  'Examity',
];

const dos = [
  'Keep Ghost Mode ON for the entire interview or exam',
  'Never turn off Ghost Mode in restricted exams or proctored tests',
  'Practice in the Practice Room before your real session',
  'Open the cheat-sheet overlay only when your screen is NOT being shared',
  'Test your audio and screen share with a friend beforehand',
  'Keep Hirebotai on your main monitor, away from shared windows',
];

const donts = [
  'Never Alt-Tab or minimize during a live screen share',
  "Don't move Hirebotai windows onto the shared monitor",
  "Don't switch virtual desktops while a proctor is watching",
  "Don't turn off Ghost Mode mid-exam — even for a second",
  "Don't share your screen while Hirebotai is visible",
  "Don't run Hirebotai on a device you don't own",
];

export function UndetectableSection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-green-500/5" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <ScrollReveal direction="up">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-sm font-medium mb-4">
              <Ghost className="w-4 h-4" />
              Ghost Mode — Zero Detection
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
              100% <span className="text-gradient">Undetectable</span>.
              <br />
              Invisible to Everyone.
            </h2>
            <p className="text-lg text-surface-400">
              Hirebotai vanishes completely during your interview — no windows, no hints, no
              traces. It never shows up in screen shares, coding assessments or restricted
              browsers, on any platform.
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid sm:grid-cols-2 gap-6 mt-14">
          {stealthModes.map((mode) => (
            <motion.div key={mode.title} className="h-full">
              <Card hover className="h-full group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-brand-500/60 to-fuchsia-500/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-surface-900/80 border border-surface-700 flex items-center justify-center">
                    <mode.icon className={`w-6 h-6 ${mode.accent}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{mode.title}</h3>
                    <p className="mt-1.5 text-sm text-surface-400 leading-relaxed">
                      {mode.description}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </StaggerContainer>

        <ScrollReveal direction="up" delay={0.15}>
          <div className="mt-12 rounded-2xl border border-surface-800 bg-surface-900/50 backdrop-blur-sm p-6 sm:p-8">
            <div className="flex items-center gap-2 text-surface-300 text-sm font-mono uppercase tracking-widest mb-5">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Never detected on these platforms
            </div>
            <div className="flex flex-wrap gap-3">
              {platforms.map((platform) => (
                <span
                  key={platform}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-950 border border-surface-700 text-surface-200 text-sm font-medium hover:border-brand-500/40 hover:text-brand-300 transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  {platform}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-transparent border border-dashed border-surface-600 text-surface-400 text-sm font-medium">
                + many more
              </span>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2}>
          <div className="mt-12">
            <div className="flex items-center gap-2 text-surface-300 text-sm font-mono uppercase tracking-widest mb-5 justify-center">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Do's & Don'ts — stay invisible, stay safe
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 sm:p-8">
                <h3 className="text-lg font-bold text-green-300 mb-4 flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  Always Do This
                </h3>
                <ul className="space-y-3">
                  {dos.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-surface-300">
                      <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 sm:p-8">
                <h3 className="text-lg font-bold text-red-300 mb-4 flex items-center gap-2">
                  <X className="w-5 h-5" />
                  Never Do This
                </h3>
                <ul className="space-y-3">
                  {donts.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-surface-300">
                      <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
