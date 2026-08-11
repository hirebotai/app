'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Download, KeyRound, Monitor, Cpu, HardDrive, Wifi, CheckCircle2, Shield, ArrowRight, Copy, ExternalLink, Zap, Terminal, Check, Command } from 'lucide-react';
import { ScrollReveal, StaggerContainer } from '@/components/animations';
import { Card, Button, Input } from '@/components/ui';
import { validateLicenseKey } from '@/lib/utils';
import { toast } from 'sonner';

const DOWNLOAD_URL = process.env.NEXT_PUBLIC_DOWNLOAD_URL || 'https://github.com/hirebotai/app/releases/download/v1.17.8.26/HireBotAi_Windows.zip';
const MAC_DOWNLOAD_URL = process.env.NEXT_PUBLIC_MAC_DOWNLOAD_URL || 'https://github.com/hirebotai/app/releases/download/v1.17.8.26/HireBotAi_Mac.zip';
const VERSION = 'v1.17.8.26';
const SIZE = '85 MB';

function trackDownload(platform: 'windows' | 'macos' | 'web') {
  const body = JSON.stringify({ platform });
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

const systemRequirements = [
  { icon: Monitor, label: 'OS', value: 'Windows 10 / 11 (64-bit)' },
  { icon: Cpu, label: 'Processor', value: 'Dual-core 2.0GHz or faster' },
  { icon: HardDrive, label: 'Storage', value: `${SIZE} free space` },
  { icon: Wifi, label: 'Internet', value: 'Required for AI (stable connection)' },
];

const installSteps = [
  { title: 'Download the zip', text: 'Click "Download App" and pick Windows to save HirebotAI_Setup.zip to your PC.' },
  { title: 'Extract & run the installer', text: 'Right-click the zip and choose "Extract All", then run HirebotAI_Setup.exe inside and follow the wizard.' },
  { title: 'Launch & activate', text: 'Open Hirebotai, enter your license key (trial keys are generated automatically), and hit Start.' },
  { title: 'Press Alt+S', text: 'Capture your first screen and watch the AI solve it in under 2 seconds.' },
];

const macSteps = [
  { title: 'Download the .zip', text: 'Click "Download App" and pick macOS. The ZIP contains the Hirebotai.app bundle.' },
  { title: 'Move to Applications', text: 'Double-click the ZIP to extract it, then drag Hirebotai.app into your Applications folder.' },
  { title: 'Right-click → Open', text: 'Right-click (or Control-click) Hirebotai.app and choose Open, then click Open again to clear the Gatekeeper block.' },
  { title: 'Grant permissions', text: 'Allow Accessibility, Screen Recording and Microphone in System Settings → Privacy & Security.' },
];

function PaymentBanner() {
  const params = useSearchParams();
  const paymentId = params.get('payment_id');
  const plan = params.get('plan');

  if (!paymentId) return null;

  return (
    <ScrollReveal direction="up">
      <div className="mb-10 rounded-2xl border border-accent-green/30 bg-accent-green/10 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-accent-green/20 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-7 h-7 text-accent-green" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">Payment confirmed — welcome aboard!</h3>
          <p className="text-sm text-surface-400">
            {plan === 'lifetime' ? 'Lifetime Pro' : plan === 'monthly' ? 'Pro Monthly' : 'Pro Yearly'} plan activated.
            Your license key has been emailed to you. Download the app below and activate it on first launch.
          </p>
        </div>
        <span className="font-mono text-xs text-accent-green bg-surface-900/60 px-3 py-1.5 rounded-lg">#{paymentId.slice(0, 12)}</span>
      </div>
    </ScrollReveal>
  );
}

function ActivationForm() {
  const [key, setKey] = useState('');
  const [valid, setValid] = useState<boolean | null>(null);

  const handleChange = (value: string) => {
    setKey(value);
    if (value.length > 4) {
      setValid(validateLicenseKey(value.trim().toUpperCase()));
    } else {
      setValid(null);
    }
  };

  const handleActivate = () => {
    const trimmed = key.trim().toUpperCase();
    if (!validateLicenseKey(trimmed)) {
      toast.error('Invalid license key format. Example: SA-PRO-ABCD1234EFGH5678-9XYZ');
      return;
    }
    toast.success('License key looks valid! Enter it in the Hirebotai app on first launch.');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(key.trim().toUpperCase()).then(() => toast.success('License key copied'));
  };

  return (
    <Card variant="gradient" padding="lg" className="h-full">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/25 mb-5">
        <KeyRound className="w-6 h-6 text-brand-400" />
      </div>
      <h3 className="font-display text-xl font-bold text-white mb-2">Already have a license?</h3>
      <p className="text-sm text-surface-400 mb-6">
        Paste your key below to verify it. On first launch, the Hirebotai app will ask for this key to unlock your plan.
      </p>
      <div className="space-y-4">
        <Input
          value={key}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="SA-PRO-XXXXXXXXXXXXXXXX-XXXX"
          className="font-mono uppercase"
          aria-label="License key"
          error={
            valid === false
              ? 'Invalid format. Use SA-PRO/SA-LIFETIME/SA-TRIAL-XXXXXXXXXXXXXXX-XXXX.'
              : undefined
          }
        />
        <div className="flex gap-3">
          <Button onClick={handleActivate} className="flex-1" disabled={key.length < 20}>
            Verify Key
          </Button>
          <Button variant="outline" onClick={handleCopy} disabled={!key.trim()}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="mt-6 pt-6 border-t border-surface-800">
        <p className="text-xs text-surface-500 leading-relaxed">
          Didn&apos;t receive your key? Check spam, or contact{' '}
          <a href="mailto:hello@hirebotai.in" className="text-brand-400 hover:text-brand-300">
            hello@hirebotai.in
          </a>{' '}
          with your payment ID.
        </p>
      </div>
    </Card>
  );
}

export function DownloadPageClient() {
  const [showOsModal, setShowOsModal] = useState(false);

  return (
    <div className="min-h-screen bg-surface-950">
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
                  hirebotai for windows &amp; macos
                </div>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.1}>
                <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
                  The Setup. <span className="text-gradient">60 Seconds.</span>
                </h1>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.2}>
                <p className="text-lg text-surface-400 max-w-xl mb-10 leading-relaxed">
                  Start your free 24-hour trial — full Pro access, no credit card. Or activate your paid plan instantly.
                </p>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.3}>
                <div className="flex flex-col sm:flex-row gap-4 mb-10">
                  <Button size="lg" icon={<Download className="w-4 h-4" />} className="w-full sm:w-auto" onClick={() => setShowOsModal(true)}>
                    Download App
                  </Button>
                  <a href="#activation">
                    <Button variant="outline" size="lg" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right" className="w-full sm:w-auto">
                      Activate License
                    </Button>
                  </a>
                </div>

                {/* OS Choice Modal Popup */}
                {showOsModal && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowOsModal(false)}>
                    <div className="bg-surface-900 border border-brand-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl animate-in fade-in zoom-in" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-mono text-xl font-bold text-white">Choose Operating System</h3>
                        <button onClick={() => setShowOsModal(false)} className="text-surface-400 hover:text-white text-lg">✕</button>
                      </div>
                      <p className="text-sm text-surface-400">Select your platform to download the Hirebotai installer.</p>

                      <div className="space-y-3">
                        <a href={DOWNLOAD_URL} onClick={() => { trackDownload('windows'); setShowOsModal(false); }} className="flex items-center justify-between p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-brand-400 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
                              <Monitor className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-mono font-bold text-white group-hover:text-brand-300">Windows 10 / 11</div>
                              <div className="text-xs text-surface-400">64-bit ZIP (HirebotAI_Setup.zip)</div>
                            </div>
                          </div>
                          <Download className="w-5 h-5 text-brand-400" />
                        </a>

                        <a href={MAC_DOWNLOAD_URL} onClick={() => { trackDownload('macos'); setShowOsModal(false); }} className="flex items-center justify-between p-4 rounded-xl bg-surface-950 border border-surface-800 hover:border-brand-400 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                              <Command className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-mono font-bold text-white group-hover:text-brand-300">macOS (Apple &amp; Intel)</div>
                              <div className="text-xs text-surface-400">Universal2 ZIP (.app)</div>
                            </div>
                          </div>
                          <Download className="w-5 h-5 text-brand-400" />
                        </a>

                        <p className="text-xs text-surface-500 leading-relaxed px-1">
                          macOS: after extracting, <span className="text-brand-400 font-medium">right-click Hirebotai.app → Open</span> the
                          first time (unidentified developer), then allow Accessibility, Screen Recording &amp; Microphone in System Settings.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.4}>
                <div className="flex flex-wrap items-center gap-6 font-mono text-xs text-surface-500">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-accent-green" />
                    {SIZE} · signed installer
                  </span>
                  <span className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-brand-400" />
                    Windows &amp; macOS Compatible
                  </span>
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-fuchsia-400" />
                    60-second setup
                  </span>
                </div>
              </ScrollReveal>
            </div>

            <div className="relative px-2 sm:px-4 pb-14 pt-4">
              <div className="absolute -inset-10 bg-[radial-gradient(ellipse_at_center,rgba(0,229,255,0.14),transparent_60%)] -z-10" />

              <ScrollReveal direction="up" delay={0.2}>
                <div className="animate-float">
                  <InstallerWindow />
                </div>
              </ScrollReveal>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
                className="absolute -top-3 -right-2 lg:-right-6 hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900/90 border border-accent-green/40 font-mono text-xs text-accent-green shadow-glow backdrop-blur-sm"
              >
                <Shield className="w-3.5 h-3.5" />
                SHA-256 verified
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute top-1/3 -left-3 lg:-left-8 hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900/90 border border-brand-500/40 font-mono text-xs text-brand-300 shadow-glow backdrop-blur-sm"
              >
                <Terminal className="w-3.5 h-3.5" />
                v1.0.0 · latest release
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4 }}
                className="absolute -bottom-2 left-10 hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900/90 border border-fuchsia-500/40 font-mono text-xs text-fuchsia-300 shadow-glow backdrop-blur-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                24h trial included
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <main className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-7xl space-y-20">
          <Suspense fallback={null}>
            <div className="max-w-3xl mx-auto">
              <PaymentBanner />
            </div>
          </Suspense>

          <StaggerContainer staggerDelay={0.1} direction="up" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {systemRequirements.map((req) => (
              <Card key={req.label} variant="default" padding="md">
                <req.icon className="w-6 h-6 text-brand-400 mb-3" />
                <div className="text-xs text-surface-500 uppercase tracking-wider mb-1">{req.label}</div>
                <div className="text-sm text-surface-200 font-medium">{req.value}</div>
              </Card>
            ))}
          </StaggerContainer>

          <div id="activation" className="grid lg:grid-cols-2 gap-8 items-stretch scroll-mt-24">
            <ScrollReveal direction="up">
              <ActivationForm />
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <Card variant="default" padding="lg" className="h-full">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-800/50 border border-surface-700 mb-5">
                  <Monitor className="w-6 h-6 text-surface-300" />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-6">Installation in 4 steps</h3>
                <ol className="space-y-6">
                  {installSteps.map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 font-mono text-sm font-semibold flex items-center justify-center">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-surface-100 mb-1">{step.title}</div>
                        <p className="text-sm text-surface-500 leading-relaxed">{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            </ScrollReveal>
          </div>

          <ScrollReveal direction="up">
            <div className="rounded-2xl border border-purple-500/20 bg-surface-900/50 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Command className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-white">Installing on macOS</h3>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {macSteps.map((step, i) => (
                  <div key={step.title} className="flex flex-col gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono text-sm font-semibold flex items-center justify-center">
                      {i + 1}
                    </div>
                    <div className="font-semibold text-surface-100 text-sm">{step.title}</div>
                    <p className="text-sm text-surface-500 leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-surface-400 leading-relaxed">
                <span className="font-semibold text-amber-300">First launch only:</span> because the app is not notarized, macOS will show
                &ldquo;Hirebotai cannot be opened because the developer cannot be verified.&rdquo; Right-click (or Control-click)
                Hirebotai.app and choose <span className="text-amber-200 font-medium">Open</span>, then click Open again. That clears the
                block permanently. You&apos;ll then be asked for Accessibility, Screen Recording and Microphone access — grant them in
                System Settings → Privacy &amp; Security.
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" className="text-center">
            <div className="rounded-3xl bg-gradient-to-br from-brand-500/10 via-surface-900/60 to-fuchsia-500/10 border border-brand-500/30 p-12">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">Trial expired or need help?</h2>
              <p className="text-surface-400 mb-8 max-w-xl mx-auto">
                Buy a Pro or Lifetime license, or reach out to support — we reply within 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="/pricing" className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-brand-500 text-surface-950 font-mono font-semibold hover:bg-brand-400 transition-all shadow-glow">
                  View Pricing
                </a>
                <a href="/support" className="inline-flex items-center gap-2 px-8 py-4 rounded-lg border border-brand-500/40 text-brand-300 font-mono font-medium hover:bg-brand-500/10 hover:border-brand-500 transition-colors">
                  Contact Support
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </main>
    </div>
  );
}

function InstallerWindow() {
  const [progress, setProgress] = useState(0);
  const done = progress >= 100;

  useEffect(() => {
    const id = setInterval(() => setProgress((p) => Math.min(p + 2, 100)), 40);
    return () => clearInterval(id);
  }, []);

  const stages = [
    { label: 'downloading installer', threshold: 12 },
    { label: 'verifying sha-256 checksum', threshold: 30 },
    { label: 'extracting files', threshold: 55 },
    { label: 'installing to program files', threshold: 78 },
    { label: 'creating desktop shortcut', threshold: 92 },
  ];

  return (
    <div className="rounded-2xl border border-surface-800 bg-surface-900/70 backdrop-blur-sm overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-800 bg-surface-950/80">
        <span className="w-2 h-2 rounded-full bg-red-500/80" />
        <span className="w-2 h-2 rounded-full bg-amber-400/80" />
        <span className="w-2 h-2 rounded-full bg-green-400/80" />
        <span className="ml-3 font-mono text-xs text-surface-500">HirebotAI_Setup.zip</span>
        <span className="ml-auto font-mono text-[10px] text-surface-600">{SIZE}</span>
      </div>
      <div className="p-6 sm:p-7">
        <div className="flex items-center gap-4 mb-7">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 flex items-center justify-center shadow-glow">
            <Terminal className="w-6 h-6 text-surface-950" />
          </div>
          <div className="text-left min-w-0">
            <div className="font-semibold text-white truncate">Hirebotai Installer</div>
            <div className="font-mono text-xs text-surface-500">v1.17.8.26 · windows 10/11 · x64</div>
          </div>
          <div className="ml-auto font-mono text-xl font-bold text-brand-400 tabular-nums">
            {progress}
            <span className="text-xs text-surface-500">%</span>
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-surface-800 overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-fuchsia-400 shadow-glow transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="space-y-2.5 font-mono text-[12px]">
          {stages.map((stage) => {
            const isDone = progress >= stage.threshold;
            const isActive = progress >= stage.threshold - 18 && !isDone;
            return (
              <div key={stage.label} className="flex items-center gap-2.5">
                <span
                  className={`w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-full border ${
                    isDone
                      ? 'bg-accent-green/20 border-accent-green/40 text-accent-green'
                      : 'border-surface-700 text-surface-600'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : <span className="w-1 h-1 rounded-full bg-current" />}
                </span>
                <span className={isDone ? 'text-accent-green' : isActive ? 'text-surface-300' : 'text-surface-600'}>
                  {stage.label}
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-2.5 pt-1">
            {done ? (
              <>
                <Check className="w-4 h-4 text-accent-green" />
                <span className="text-accent-green">launch hirebotai — trial auto-activated</span>
                <span className="inline-block w-2 h-4 bg-brand-400 animate-blink" />
              </>
            ) : (
              <>
                <span className="w-4 h-4 flex items-center justify-center rounded-full border border-brand-500/40">
                  <span className="w-1 h-1 rounded-full bg-brand-400 animate-pulse" />
                </span>
                <span className="text-surface-500">installing...</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
