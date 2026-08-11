'use client';

import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/animations';
import { Button } from '@/components/ui';
import { ArrowRight, Shield, Cpu, Zap, Download } from 'lucide-react';
import { Magnetic } from '@/components/animations/ScrollReveal';

export function CTASection() {
  return (
    <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-fuchsia-500/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-500/5 via-transparent to-transparent" />
      
      <div className="mx-auto max-w-4xl relative text-center">
        <ScrollReveal direction="up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-500/10 border border-brand-500/30 font-mono text-xs uppercase tracking-[0.2em] text-brand-400 mb-6">
            Ready to ace your next interview
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Start Your <span className="text-gradient">24-Hour Free Trial</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2}>
          <p className="text-lg sm:text-xl text-surface-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            No credit card. No commitment. Full access to all Pro features. Join 2,800+ engineers who landed their dream roles.
          </p>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.3}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Magnetic>
              <a href="/download">
                <Button size="xl" icon={<Download className="w-5 h-5" />} iconPosition="left" className="w-full sm:w-auto">
                  Download Free Trial
                </Button>
              </a>
            </Magnetic>
            <Button variant="outline" size="xl" className="w-full sm:w-auto">
              View Pricing
            </Button>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.4}>
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            <CTABadge icon={Shield} label="Invisible to Screen Sharing" />
            <CTABadge icon={Cpu} label="Multi-Provider AI" />
            <CTABadge icon={Zap} label="<50ms Latency" />
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.5} className="mt-12">
          <motion.div
            className="inline-flex items-center gap-4 px-6 py-3 rounded-xl bg-surface-900/50 border border-surface-800"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-2 text-surface-400 text-sm">
              <Shield className="w-4 h-4 text-green-400" />
              <span>Trusted by engineers at</span>
            </div>
            <div className="flex items-center gap-3">
              <CompanyLogo name="Google" />
              <CompanyLogo name="Amazon" />
              <CompanyLogo name="Stripe" />
              <CompanyLogo name="Vercel" />
              <CompanyLogo name="OpenAI" />
              <CompanyLogo name="Datadog" />
            </div>
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function CTABadge({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-surface-900/50 border border-surface-800 hover:border-brand-500/30 transition-colors"
      whileHover={{ y: -2 }}
    >
      <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-brand-400" />
      </div>
      <span className="text-sm font-medium text-surface-300">{label}</span>
    </motion.div>
  );
}

function CompanyLogo({ name }: { name: string }) {
  const logos: Record<string, React.ReactNode> = {
    Google: (
      <svg className="h-5 w-auto" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    Amazon: (
      <svg className="h-5 w-auto" viewBox="0 0 24 24" fill="#FF9900">
        <path d="M19.28 10.35c-.59 0-1.18-.06-1.76-.18-1.03-.2-2.02-.54-2.96-1.03-.6-.31-1.18-.66-1.76-1.04-.58-.39-1.11-.82-1.6-1.3-.48-.48-.91-1.01-1.28-1.58-.36-.57-.66-1.17-.88-1.79-.2-.6-.33-1.23-.39-1.9-.05-.63-.08-1.25-.08-1.88 0-.6.03-1.18.08-1.73.05-.55.18-1.09.39-1.61.21-.52.51-1.02.88-1.5.37-.48.8-1.01 1.28-1.5.48-.48.92-.89 1.6-1.3.58-.39 1.17-.67 1.76-1.03.94-.5 1.93-.83 2.96-1.03.58-.12 1.17-.18 1.76-.18.57 0 1.16.06 1.76.18 1.03.2 2.02.53 2.96 1.03.6.3 1.17.65 1.76 1.04.48.48.9.99 1.28 1.5.37.57.66 1.16.88 1.78.22.63.34 1.25.39 1.88.05.63.08 1.25.08 1.88 0 .6-.03 1.18-.08 1.73-.05.55-.18 1.09-.39 1.61-.2.52-.51 1.02-.88 1.5-.37.48-.8 1.01-1.28 1.5-.48.48-.91.89-1.6 1.3-.57.39-1.17.67-1.76 1.03-.94.5-1.93.83-2.96 1.03-.57.12-1.16.18-1.76.18zm-6.58 6.25c-.04.2-.06.4-.06.61 0 .41.05.8.12 1.17.1.57.33 1.11.66 1.61.33.49.74.92 1.2.1.31.46.6.68.95.22.36.51.66.88.9.36.24.77.42 1.22.51.45.09.92.14 1.41.14.47 0 .94-.05 1.41-.14.45-.09.86-.27 1.21-.51.37-.24.67-.54.9-.9.22-.34.44-.64.66-.95.33-.5.55-1.03.66-1.6.07-.36.11-.75.11-1.16 0-.41-.04-.8-.11-1.17-.33-.57-.65-1.11-1.08-1.6-.43-.49-.94-.92-1.53-1.28-.58-.36-1.23-.65-1.96-.85-.73-.2-1.51-.3-2.34-.3-.83 0-1.61.1-2.34.3-.73.2-1.38.5-1.96.85-.6.36-1.1.79-1.53 1.28-.43.49-.75 1.03-1.08 1.6-.07.37-.11.75-.11 1.17 0 .41.04.8.11 1.16.1.5.32 1.03.65 1.6.32.5.74.93 1.2 1.28.47.35 1.03.63 1.69.84z"/>
      </svg>
    ),
    Stripe: (
      <svg className="h-5 w-auto text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.94 13.58c-.37-.36-.78-.76-1.18-1.19l-5.25-5.57 5.28-5.57c.4-.41.81-.82 1.2-1.18.78-.78 1.51-1.6 2.21-2.36C21.48 1.84 20.27 1.03 18.91.28 17.57-.45 16.08-.17 14.67.52 13.26 1.19 12.04 2.4 11.34 4.04c-.68 1.6-.99 3.42-.87 5.19.23 3.53 2.09 6.77 5.47 8.53.24.12.48.25.71.39.23.14.46.3.68.47.46.35.91.72 1.31 1.1.77.74 1.47 1.56 2.06 2.46.19.29.33.6.39.93.08.45.08.91.08 1.38 0 .82-.14 1.63-.42 2.43-.3.84-.72 1.63-1.25 2.35-.52.73-1.14 1.38-1.86 1.9-.36.26-.75.5-1.15.7-.4.19-.8.34-1.2.43-.79.17-1.63.17-2.5 0-.87-.17-1.7-.35-2.5-.71zM20.91 5.32c-.52-.66-1.08-1.27-1.65-1.83-.57-.57-1.18-1.09-1.84-1.58-.39-.31-.8-.59-1.23-.81-.42-.21-.85-.38-1.29-.49-.44-.12-.89-.19-1.35-.19-.46 0-.9.07-1.35.19-.44.12-.87.29-1.29.49-.42.22-.83.5-1.23.81-.66.49-1.27 1.01-1.84 1.58-.57.56-1.13 1.17-1.65 1.83-.94 1.2-1.58 2.63-1.9 4.28-.36 1.79-.27 3.7.26 5.67.53 1.97 1.72 3.71 3.53 5.18 1.8 1.47 3.92 2.2 6.1 2.2 2.18 0 4.25-.73 6.1-2.2 1.8-1.47 3-3.21 3.53-5.18.53-1.97.43-3.88-.26-5.67-.32-1.65-.96-3.08-1.9-4.28z"/>
      </svg>
    ),
    Vercel: (
      <svg className="h-5 w-auto text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.536 1.562V22.375H2.464V1.562H21.536ZM20.117 20.836H3.883V3.101H20.117V20.836ZM13.589 10.922L8.417 20.32H11.143L13.589 15.746L16.035 20.32H18.762L13.589 10.922Z"/>
      </svg>
    ),
    OpenAI: (
      <svg className="h-5 w-auto text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10C22 6.48 17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1.25-13c-.69 0-1.25.56-1.25 1.25v5.5c0 .69.56 1.25 1.25 1.25.69 0 1.25-.56 1.25-1.25v-5.5c0-.69-.56-1.25-1.25-1.25zm0 16c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>
      </svg>
    ),
    Datadog: (
      <svg className="h-5 w-auto text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.5 12.5v-1h-1v1h1zM17.5 8.5v-1h-1v1h1zM13.5 4.5v-1h-1v1h1zM9.5 8.5v-1h-1v1h1zM5.5 12.5v-1h-1v1h1zM3.5 16.5v-1h-1v1h1zM5.5 20.5v-1h-1v1h1zM9.5 20.5v-1h-1v1h1zM13.5 20.5v-1h-1v1h1zM17.5 20.5v-1h-1v1h1zM21.5 20.5v-1h-1v1h1zM21.5 16.5v-1h-1v1h1zM21.5 8.5v-1h-1v1h1zM21.5 4.5v-1h-1v1h1zM17.5 4.5v-1h-1v1h1zM13.5 4.5v-1h-1v1h1zM9.5 4.5v-1h-1v1h1zM5.5 4.5v-1h-1v1h1zM3.5 4.5v-1h-1v1h1zM3.5 8.5v-1h-1v1h1zM3.5 12.5v-1h-1v1h1zM3.5 20.5v-1h-1v1h1z"/>
      </svg>
    ),
  };

  return (
    <span className="opacity-60 hover:opacity-100 transition-opacity" aria-label={name}>
      {logos[name]}
    </span>
  );
}