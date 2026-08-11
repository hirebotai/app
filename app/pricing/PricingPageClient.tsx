'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Shield, CreditCard, RefreshCcw, BadgeCheck, ChevronDown, ArrowRight, Zap, Tag, BadgePercent, X } from 'lucide-react';
import { ScrollReveal, StaggerContainer } from '@/components/animations';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { RAZORPAY_PLANS } from '@/lib/razorpay';
import { useRazorpayCheckout } from '@/lib/hooks/useRazorpayCheckout';
import { AuthPromptModal } from '@/components/auth/AuthPromptModal';
import { toast } from 'sonner';

const faqs = [
  {
    q: 'How does the free trial work?',
    a: 'Download Hirebotai and get 24 hours of full Pro access — no credit card required. Your license key is generated instantly and activates automatically on first launch.',
  },
  {
    q: 'How is the Pro plan billed?',
    a: 'Pro is billed monthly (₹149/mo) or yearly (₹1,499/yr, 16% off). Cancel anytime — you keep access until the end of your billing period. Payment is handled securely by Razorpay (UPI, cards, net banking, wallets).',
  },
  {
    q: 'What is the Lifetime plan?',
    a: 'Pay once (₹4,999) and own Hirebotai forever. Includes all future updates, unlimited device activations, direct developer access, and custom integration support.',
  },
  {
    q: 'Is there a refund policy?',
    a: 'No refunds — all sales are final. Please use our full-featured 24-hour free trial to test all features (screen capture, audio transcription, HUD, ghost mode) on your PC before purchasing a license.',
  },
  {
    q: 'Can I use it on multiple devices?',
    a: 'Pro includes 1 active device (you can transfer your license). Lifetime includes unlimited device activations.',
  },
  {
    q: 'Is my license valid forever with Lifetime?',
    a: 'Yes. Lifetime licenses are valid forever with no recurring fees, and you receive every future feature update at no extra cost.',
  },
];

export function PricingPageClient() {
  const { openCheckout, authRequired, closeAuthPrompt } = useRazorpayCheckout();
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number; applicablePlans: string[] } | null>(null);
  const [monthlyMode, setMonthlyMode] = useState<'subscription' | 'one-time'>('subscription');
  const [yearlyMode, setYearlyMode] = useState<'subscription' | 'one-time'>('subscription');

  const handlePurchase = async (planId: string, interval: 'monthly' | 'yearly' | 'lifetime', mode: 'subscription' | 'one-time' = 'subscription') => {
    if (appliedCoupon && mode === 'subscription' && interval !== 'lifetime') {
      toast.error('Coupons only apply to One-time and Lifetime purchases. Switch to One-time payment to use your coupon.');
      return;
    }
    if (appliedCoupon && !appliedCoupon.applicablePlans.includes(interval)) {
      const names = appliedCoupon.applicablePlans.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
      toast.error(`This coupon is only valid for: ${names}.`);
      return;
    }
    try {
      await openCheckout({
        plan_id: planId,
        interval,
        email: undefined,
        coupon: appliedCoupon?.code,
        discountPercent: appliedCoupon?.discountPercent,
        oneTime: mode === 'one-time',
      });
    } catch {
      toast.error('Checkout failed. Please try again.');
    }
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      toast.error('Enter a coupon code');
      return;
    }
    setCouponLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({ code: data.code, discountPercent: data.discountPercent, applicablePlans: data.applicablePlans ?? ['monthly', 'yearly', 'lifetime'] });
        setMonthlyMode('one-time');
        setYearlyMode('one-time');
        toast.success(`${data.code} applied — ${data.discountPercent}% off · switched to One-time`);
      } else {
        setAppliedCoupon(null);
        toast.error(data.error || 'Invalid coupon code');
      }
    } catch {
      setAppliedCoupon(null);
      toast.error('Could not validate coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
  };

  const fmtPrice = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;
  const cardPrice = (basePaise: number, showDiscount: boolean) =>
    appliedCoupon && showDiscount ? Math.round((basePaise * (100 - appliedCoupon.discountPercent)) / 100) : basePaise;
  const cardOriginal = (basePaise: number, showDiscount: boolean) =>
    appliedCoupon && showDiscount ? fmtPrice(basePaise) : undefined;

  return (
    <div className="min-h-screen bg-surface-950">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,229,255,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,0,200,0.08),transparent_55%)]" />
        <div className="absolute inset-0 scanlines opacity-60" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-2 pb-10 lg:pt-3 lg:pb-12 w-full text-center">
          <ScrollReveal direction="up">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-surface-900/70 border border-brand-500/30 font-mono text-xs text-brand-400 mb-8">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              simple, transparent pricing
            </div>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
              Pay for the <span className="text-gradient">Result</span>, Not the Effort
            </h1>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.2}>
            <p className="text-lg text-surface-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Start free with a 24-hour trial. No credit card required. Every paid plan is secured by UPI, cards, net
              banking, and instant license activation.
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.25}>
            <div className="flex flex-col items-center justify-center gap-3 mb-10">
              {appliedCoupon ? (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-sm">
                    <BadgePercent className="w-4 h-4" />
                    <span className="font-bold">{appliedCoupon.code}</span>
                    <span>-{appliedCoupon.discountPercent}%</span>
                    <button
                      onClick={removeCoupon}
                      className="ml-1 text-emerald-300/70 hover:text-emerald-200 transition-colors"
                      aria-label="Remove coupon"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-[11px] font-mono text-surface-500">
                    Valid for: {appliedCoupon.applicablePlans.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' · ')}
                  </span>
                </>
              ) : (
                <div className="inline-flex items-center gap-2 w-full max-w-md">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-surface-500 absolute left-3 top-3" />
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                      placeholder="Have a coupon? Enter code"
                      className="w-full bg-surface-900/80 border border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-surface-500 focus:border-brand-400 focus:outline-none font-mono uppercase"
                    />
                  </div>
                  <Button variant="outline" size="md" onClick={applyCoupon} loading={couponLoading} disabled={!couponInput.trim()}>
                    Apply
                  </Button>
                </div>
              )}
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.3}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
<ShowcaseCard
  tag="pro"
  price={fmtPrice(cardPrice(RAZORPAY_PLANS.pro_monthly.price, monthlyMode === 'one-time'))}
  originalPrice={cardOriginal(RAZORPAY_PLANS.pro_monthly.price, monthlyMode === 'one-time')}
  sub="billed monthly"
  points={[
    'Unlimited Screen Captures',
    'Unlimited Interview Sessions',
    'Resume Context Integration',
    'Cheat Sheet Overlay (Alt+N)',
    'Practice Room Access',
    'Session History & Analytics',
    'Priority Email Support',
    '1 Device Activation',
  ]}
  highlight={false}
  accent="text-white"
  mode={monthlyMode}
  onModeChange={setMonthlyMode}
  onBuy={() => handlePurchase(RAZORPAY_PLANS.pro_monthly.razorpay_plan_id, 'monthly', monthlyMode)}
/>
<ShowcaseCard
  tag="pro"
  price={fmtPrice(cardPrice(RAZORPAY_PLANS.pro_yearly.price, yearlyMode === 'one-time'))}
  originalPrice={cardOriginal(RAZORPAY_PLANS.pro_yearly.price, yearlyMode === 'one-time')}
  sub="billed yearly · save 16%"
  points={[
    'Unlimited Screen Captures',
    'Unlimited Interview Sessions',
    'Resume Context Integration',
    'Cheat Sheet Overlay (Alt+N)',
    'Practice Room Access',
    'Session History & Analytics',
    'Priority Email Support',
    '1 Device Activation',
  ]}
  highlight={true}
  accent="text-white"
  mode={yearlyMode}
  onModeChange={setYearlyMode}
  onBuy={() => handlePurchase(RAZORPAY_PLANS.pro_yearly.razorpay_plan_id, 'yearly', yearlyMode)}
/>
<ShowcaseCard
  tag="lifetime"
  price={fmtPrice(cardPrice(RAZORPAY_PLANS.lifetime.price, true))}
  originalPrice={cardOriginal(RAZORPAY_PLANS.lifetime.price, true)}
  sub="one-time · own it forever"
  points={[
    'Unlimited Screen Captures',
    'Unlimited Interview Sessions',
    'Resume Context Integration',
    'Cheat Sheet Overlay (Alt+N)',
    'Practice Room Access',
    'Session History & Analytics',
    'Priority Email Support',
    'Unlimited Device Activations',
    'Lifetime Updates',
    'Direct Developer Access',
    'Custom Integration Support',
  ]}
              highlight={false}
  accent="text-amber-400"
  onBuy={() => handlePurchase(RAZORPAY_PLANS.lifetime.razorpay_plan_id, 'lifetime')}
/>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.3}>
            <div className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-4 font-mono text-xs text-surface-500">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent-green" /> 7-day money-back guarantee
              </span>
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-brand-400" /> UPI · cards · netbanking
              </span>
              <span className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-fuchsia-400" /> instant license activation
              </span>
              <span className="flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-amber-400" /> cancel anytime
              </span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <main className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-7xl space-y-24">
          <GuaranteeStrip />

          <section>
            <ScrollReveal direction="up">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white text-center mb-12">
                Frequently Asked Questions
              </h2>
            </ScrollReveal>
            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, i) => (
                <ScrollReveal key={faq.q} direction="up" delay={0.05 * i}>
                  <FaqItem question={faq.q} answer={faq.a} />
                </ScrollReveal>
              ))}
            </div>
          </section>

          <ScrollReveal direction="up" className="text-center">
            <div className="rounded-3xl bg-gradient-to-br from-brand-500/10 via-surface-900/60 to-fuchsia-500/10 border border-brand-500/30 p-12 lg:p-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                Still Undecided?
              </h2>
              <p className="text-surface-400 text-lg mb-8 max-w-xl mx-auto">
                Try the full 24-hour trial — access every Pro feature before you pay a rupee.
              </p>
              <a href="/download" className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-brand-500 text-surface-950 font-mono font-semibold hover:bg-brand-400 transition-all shadow-glow hover:shadow-glow-lg">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </main>

      <AuthPromptModal open={authRequired} onClose={closeAuthPrompt} />
    </div>
  );
}

function GuaranteeStrip() {
  const items = [
    { icon: Shield, title: 'Secure Payments', text: 'All payments processed by Razorpay — UPI, cards, net banking & wallets.' },
    { icon: RefreshCcw, title: '7-Day Refund', text: 'Money-back guarantee if it is not a fit. No questions asked.' },
    { icon: CreditCard, title: 'Instant Activation', text: 'License key delivered the moment your payment is confirmed.' },
    { icon: Zap, title: 'Instant Access', text: 'Download the installer and start your trial in under 60 seconds.' },
  ];
  return (
    <StaggerContainer staggerDelay={0.1} direction="up" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((item) => (
        <Card key={item.title} variant="default" padding="md" className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 mb-4">
            <item.icon className="w-6 h-6 text-brand-400" />
          </div>
          <h3 className="font-semibold text-white mb-1">{item.title}</h3>
          <p className="text-sm text-surface-500">{item.text}</p>
        </Card>
      ))}
    </StaggerContainer>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-surface-800 bg-surface-900/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-semibold text-surface-100">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-surface-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <p className="px-6 pb-5 text-sm text-surface-400 leading-relaxed">{answer}</p>
      </motion.div>
    </div>
  );
}

function ShowcaseCard({ tag, price, originalPrice, sub, points, highlight, accent, mode, onModeChange, onBuy }: { tag: string; price: string; originalPrice?: string; sub: string; points: string[]; highlight: boolean; accent: string; mode?: 'subscription' | 'one-time'; onModeChange?: (m: 'subscription' | 'one-time') => void; onBuy: () => void }) {
  return (
    <div
      className={`group relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${
        highlight
          ? 'border-brand-500/60 bg-brand-500/5 shadow-glow-lg hover:shadow-glow-lg'
          : 'border-surface-800 bg-surface-900/60 hover:border-brand-500/40 hover:-translate-y-1'
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500 text-white text-[10px] font-mono font-medium shadow-glow whitespace-nowrap">
            <BadgeCheck className="w-3 h-3" />
            most popular
          </span>
        </div>
      )}
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-surface-500 mb-4">{tag}</div>
      <div className={`font-display text-4xl font-bold mb-1 ${accent}`}>
        {price}
        {originalPrice && (
          <span className="ml-2 font-display text-xl font-semibold text-surface-500 line-through">
            {originalPrice}
          </span>
        )}
      </div>
      <div className="text-xs text-surface-500 mb-6">{sub}</div>
      <ul className="space-y-2.5 mb-8 flex-1">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-2.5 text-sm text-surface-300">
            <Check className={`w-4 h-4 flex-shrink-0 ${highlight ? 'text-brand-400' : 'text-surface-500'}`} />
            {p}
          </li>
        ))}
      </ul>
      {onModeChange && mode && (
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface-950/60 border border-surface-700">
            <button
              type="button"
              onClick={() => onModeChange('subscription')}
              className={cn(
                'rounded-md py-1.5 text-xs font-mono font-semibold transition-colors',
                mode === 'subscription'
                  ? 'bg-brand-500 text-surface-950'
                  : 'text-surface-400 hover:text-surface-200'
              )}
            >
              Auto-renew
            </button>
            <button
              type="button"
              onClick={() => onModeChange('one-time')}
              className={cn(
                'rounded-md py-1.5 text-xs font-mono font-semibold transition-colors',
                mode === 'one-time'
                  ? 'bg-brand-500 text-surface-950'
                  : 'text-surface-400 hover:text-surface-200'
              )}
            >
              One-time
            </button>
          </div>
          <p className="text-[11px] text-surface-500 mt-1.5 text-center">
            {mode === 'one-time' ? 'Pay once, no auto-renewal.' : 'Recurring until you cancel.'}
          </p>
        </div>
      )}
      <button
        onClick={onBuy}
        className={`w-full px-6 py-3 rounded-xl font-mono text-sm font-semibold transition-all ${
          highlight
            ? 'bg-brand-500 text-surface-950 shadow-glow hover:bg-brand-400 hover:shadow-glow-lg'
            : 'bg-surface-800/50 border border-surface-700 text-white hover:bg-surface-800 hover:border-surface-600'
        }`}
      >
        {onModeChange ? (mode === 'one-time' ? 'Pay Once' : 'Subscribe Now') : 'Buy Now'}
      </button>
    </div>
  );
}
