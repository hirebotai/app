'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageCircle, LifeBuoy, BookOpen, Send, CheckCircle2, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { ScrollReveal, StaggerContainer } from '@/components/animations';
import { Card, Button, Input } from '@/components/ui';
import { toast } from 'sonner';

const channels = [
  {
    icon: Mail,
    title: 'Email Support',
    text: 'hello@hirebotai.in',
    sub: 'Replies within 24 hours',
    href: 'mailto:hello@hirebotai.in',
    cta: 'Send an email',
  },
  {
    icon: MessageCircle,
    title: 'Discord Community',
    text: 'discord.gg/hirebotai',
    sub: 'Live help from the team & users',
    href: 'https://discord.gg/hirebotai',
    cta: 'Join the server',
  },
  {
    icon: BookOpen,
    title: 'Documentation',
    text: 'Docs & user guide',
    sub: 'Setup, hotkeys, troubleshooting',
    href: '/features',
    cta: 'Read the docs',
  },
  {
    icon: LifeBuoy,
    title: 'License Help',
    text: 'Activation & Support',
    sub: 'Lost keys, device transfer, billing',
    href: 'mailto:billing@hirebotai.in',
    cta: 'Get billing help',
  },
];

const faqs = [
  {
    q: 'Where is my license key after purchase?',
    a: 'Your key is emailed instantly to the address used at checkout. If you don’t see it, check spam/promotions. You can also paste your payment ID on the Download page to re-verify.',
  },
  {
    q: 'How do I activate Hirebotai?',
    a: 'Launch the app, go to the License tab in the dashboard, paste your key (SA-PRO-..., SA-LIFETIME-... or SA-TRIAL-...), and click Activate. You need internet for one-time activation.',
  },
  {
    q: 'I changed my PC. How do I move my license?',
    a: 'Pro licenses allow 1 active device. Deactivate the old device from its dashboard, then activate on the new PC with the same key. Lifetime licenses allow unlimited devices.',
  },
  {
    q: 'The app shows "License expired" on trial.',
    a: 'Trials last 24 hours from first activation. After expiry, purchase Pro or Lifetime. Your data, sessions, and cheat sheets are preserved — you never lose them.',
  },
  {
    q: 'Does Hirebotai work with Zoom/Teams/Discord screen share?',
    a: 'Yes. Ghost mode (Alt+T) uses Windows Display Affinity (WDA_EXCLUDEFROMCAPTURE), making the HUD invisible to all screen recorders and screen-sharing software.',
  },
  {
    q: 'What is your refund policy?',
    a: 'All sales are final — no refunds. We provide a full-featured 24-hour free trial with complete Pro access so you can thoroughly test the app on your system before making a purchase.',
  },
];

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('question');
  const [appVersion, setAppVersion] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Please fill in your name, email, and message.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, category, app_version: appVersion }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Message sent! We\u2019ll reply within 24 hours.');
        setName('');
        setEmail('');
        setSubject('');
        setCategory('question');
        setAppVersion('');
        setMessage('');
      } else {
        toast.error(data.error || 'Something went wrong. Please email hello@hirebotai.in directly.');
      }
    } catch {
      toast.error('Network error. Please email hello@hirebotai.in directly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card variant="default" padding="lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/25">
          <Send className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-white">Send us a message</h3>
          <p className="text-sm text-surface-500">We usually reply within 24 hours</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
            required
          />
        </div>
        <Input
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="License activation issue"
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">
              What is this about?
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface-950 border border-surface-800 text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-transparent transition-all appearance-none"
            >
              <option value="bug">🐛 Bug report</option>
              <option value="feature">✨ Feature request</option>
              <option value="question">❓ Question</option>
              <option value="other">📦 Other</option>
            </select>
          </div>
          <Input
            label="App version (optional)"
            value={appVersion}
            onChange={(e) => setAppVersion(e.target.value)}
            placeholder="1.0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Describe your issue — include your license key or payment ID if relevant."
            required
            className="w-full px-4 py-3 rounded-xl bg-surface-950 border border-surface-800 text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-transparent transition-all resize-y"
          />
        </div>
        <Button type="submit" disabled={sending} className="w-full sm:w-auto">
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Message
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}

export function SupportPageClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-surface-950">
      <section className="relative overflow-hidden pb-12">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,229,255,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,0,200,0.08),transparent_55%)]" />
        <div className="absolute inset-0 scanlines opacity-60" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative px-2 sm:px-4 pb-14 order-2 lg:order-1">
              <div className="absolute -inset-10 bg-[radial-gradient(ellipse_at_center,rgba(0,229,255,0.12),transparent_60%)] -z-10" />

              <div className="rounded-2xl border border-surface-800 bg-surface-900/70 backdrop-blur-sm overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-800 bg-surface-950/80">
                  <span className="w-2 h-2 rounded-full bg-red-500/80" />
                  <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                  <span className="w-2 h-2 rounded-full bg-green-400/80" />
                  <span className="ml-3 font-mono text-xs text-surface-500">support — hirebotai</span>
                  <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] text-accent-green">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" /> online
                  </span>
                </div>
                <div className="p-4 sm:p-5 space-y-3">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[78%] rounded-2xl rounded-br-md bg-brand-500/15 border border-brand-500/30 px-4 py-2.5 font-mono text-xs text-surface-200 leading-relaxed">
                      my pro license won't activate on my new pc
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-surface-800/80 border border-surface-700 px-4 py-2.5 font-mono text-xs text-surface-300 leading-relaxed">
                      no worries — pro allows <span className="text-brand-300">1 active device</span>. deactivate it on
                      your old pc from the dashboard, then activate on the new one with the same key.
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.7 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[78%] rounded-2xl rounded-br-md bg-brand-500/15 border border-brand-500/30 px-4 py-2.5 font-mono text-xs text-surface-200 leading-relaxed">
                      done — worked instantly. thank you
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.3 }}
                    className="flex justify-start items-center"
                  >
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-bl-md bg-surface-800/80 border border-surface-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:300ms]" />
                      <span className="ml-1 font-mono text-[11px] text-surface-500">avg reply &lt;24h</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
                className="absolute -left-2 top-4 hidden sm:block"
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900/90 border border-brand-500/40 font-mono text-[11px] text-brand-300 shadow-glow backdrop-blur-sm">
                  <Mail className="w-3.5 h-3.5" />
                  hello@hirebotai.in
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute top-2 -right-2 hidden sm:block"
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900/90 border border-accent-green/40 font-mono text-[11px] text-accent-green shadow-glow backdrop-blur-sm">
                  <BookOpen className="w-3.5 h-3.5" />
                  docs + hotkey guide
                </div>
              </motion.div>
            </div>

            <div className="order-1 lg:order-2">
              <ScrollReveal direction="up">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-surface-900/70 border border-brand-500/30 font-mono text-xs text-brand-400 mb-8">
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                  we&apos;re here to help
                </div>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.1}>
                <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
                  Support & <span className="text-gradient">Help Center</span>
                </h1>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.2}>
                <p className="text-lg text-surface-400 max-w-xl mb-10 leading-relaxed">
                  Setup guides, common fixes, and a real human on the other end. Average response time: under 24 hours.
                </p>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.3}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a href="#contact">
                    <Button size="xl" icon={<Send className="w-5 h-5" />} className="w-full sm:w-auto">
                      contact us
                    </Button>
                  </a>
                  <a href="/features">
                    <Button
                      variant="outline"
                      size="xl"
                      icon={<ArrowRight className="w-4 h-4" />}
                      iconPosition="right"
                      className="w-full sm:w-auto whitespace-nowrap"
                    >
                      read the docs
                    </Button>
                  </a>
                </div>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.4}>
                <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-mono text-xs text-surface-500">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-brand-400" /> 4 support channels
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent-green" /> 24h free trial
                  </span>
                  <span className="flex items-center gap-2">
                    <LifeBuoy className="w-4 h-4 text-fuchsia-400" /> Test on 24h trial before purchase
                  </span>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      <main className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-7xl space-y-20">
          <StaggerContainer staggerDelay={0.1} direction="up" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {channels.map((channel) => (
              <a key={channel.title} href={channel.href} target={channel.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="group">
                <Card variant="default" hover padding="lg" className="h-full flex flex-col">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 mb-4 group-hover:border-brand-500/40 transition-colors">
                    <channel.icon className="w-6 h-6 text-brand-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{channel.title}</h3>
                  <p className="text-sm text-brand-400 font-mono mb-1 break-all">{channel.text}</p>
                  <p className="text-xs text-surface-500 mb-4 flex-1">{channel.sub}</p>
                  <span className="text-sm font-medium text-brand-400 group-hover:text-brand-300">{channel.cta} →</span>
                </Card>
              </a>
            ))}
          </StaggerContainer>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <ScrollReveal direction="up" className="scroll-mt-28" id="contact">
              <ContactForm />
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.1}>
              <Card variant="default" padding="lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">Common issues</h3>
                    <p className="text-sm text-surface-500">Fast fixes for the most reported problems</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {faqs.map((faq, i) => (
                    <div key={faq.q} className="rounded-xl border border-surface-800 bg-surface-900/50 overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left"
                      >
                        <span className="font-medium text-sm text-surface-100">{faq.q}</span>
                        <span className={`text-brand-400 transition-transform duration-200 flex-shrink-0 mt-0.5 ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                      </button>
                      <motion.div
                        initial={false}
                        animate={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-4 text-sm text-surface-400 leading-relaxed">{faq.a}</p>
                      </motion.div>
                    </div>
                  ))}
                </div>
              </Card>
            </ScrollReveal>
          </div>

          <ScrollReveal direction="up" className="text-center">
            <div className="rounded-3xl bg-gradient-to-br from-brand-500/10 via-surface-900/60 to-fuchsia-500/10 border border-brand-500/30 p-12">
              <CheckCircle2 className="w-10 h-10 text-accent-green mx-auto mb-4" />
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">Still stuck?</h2>
              <p className="text-surface-400 mb-8 max-w-xl mx-auto">
                Upgrade to Lifetime for direct developer access and priority 1:1 support.
              </p>
              <a href="/pricing" className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-brand-500 text-surface-950 font-mono font-semibold hover:bg-brand-400 transition-all shadow-glow">
                See Plans
              </a>
            </div>
          </ScrollReveal>
        </div>
      </main>
    </div>
  );
}
