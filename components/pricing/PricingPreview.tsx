'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollReveal, StaggerContainer } from '@/components/animations';
import { Card, Button } from '@/components/ui';
import { Check, X, Crown, Zap, Shield, Download, Cpu } from 'lucide-react';
import { RAZORPAY_PLANS } from '@/lib/razorpay';
import { useRazorpayCheckout } from '@/lib/hooks/useRazorpayCheckout';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

type PricingPlan = {
  id: string;
  name: string;
  edition: 'pro' | 'lifetime';
  price: number;
  interval: string;
  razorpay_plan_id: string;
  features: readonly string[];
  cta_text: string;
  popular?: boolean;
};



export function PricingPreview() {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('yearly');
  const { openCheckout } = useRazorpayCheckout();

  const plans: PricingPlan[] = [
    {
      ...RAZORPAY_PLANS.pro_monthly,
      price: interval === 'monthly' ? RAZORPAY_PLANS.pro_monthly.price : RAZORPAY_PLANS.pro_yearly.price,
      interval: interval === 'monthly' ? 'monthly' : 'yearly',
      razorpay_plan_id: interval === 'monthly' ? RAZORPAY_PLANS.pro_monthly.razorpay_plan_id : RAZORPAY_PLANS.pro_yearly.razorpay_plan_id,
      cta_text: interval === 'monthly' ? RAZORPAY_PLANS.pro_monthly.cta_text : RAZORPAY_PLANS.pro_yearly.cta_text,
      popular: interval === 'yearly',
    },
    {
      ...RAZORPAY_PLANS.lifetime,
      price: RAZORPAY_PLANS.lifetime.price,
      interval: 'lifetime',
      razorpay_plan_id: RAZORPAY_PLANS.lifetime.razorpay_plan_id,
    },
  ];

  const handlePurchase = async (plan: PricingPlan) => {
    try {
      await openCheckout({
        plan_id: plan.razorpay_plan_id,
        interval: plan.interval as 'monthly' | 'yearly',
        email: undefined,
      });
    } catch (error) {
      toast.error('Checkout failed. Please try again.');
    }
  };

  return (
    <section id="pricing" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal direction="up">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-md bg-brand-500/10 border border-brand-500/30 font-mono text-xs uppercase tracking-[0.2em] text-brand-400 mb-4">
              Simple, Transparent Pricing
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
              Choose Your Plan
            </h2>
            <p className="text-lg text-surface-400 max-w-2xl mx-auto mb-8">
              Start with a 24-hour free trial. No credit card required. Upgrade anytime.
            </p>

            <div className="inline-flex items-center p-1 bg-surface-900 border border-surface-800 rounded-xl">
              {['monthly', 'yearly'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setInterval(opt as 'monthly' | 'yearly')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    interval === opt
                      ? 'bg-brand-500 text-surface-950 shadow-glow'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {opt === 'monthly' ? 'Monthly' : 'Yearly'}
                  {opt === 'yearly' && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                      Save 16%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.15} direction="up" className="grid lg:grid-cols-2 gap-8 mb-16">
          {plans.map((plan, i) => (
            <ScrollReveal key={plan.id} direction="up" delay={0.1 + i * 0.1}>
              <PricingCard plan={plan} onPurchase={handlePurchase} interval={interval} />
            </ScrollReveal>
          ))}
        </StaggerContainer>


      </div>
    </section>
  );
}

function PricingCard({ plan, onPurchase, interval }: { plan: PricingPlan; onPurchase: (plan: PricingPlan) => void; interval: 'monthly' | 'yearly' }) {
  const isPopular = plan.popular;
  const isLifetime = plan.interval === 'lifetime';

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative h-full"
    >
      <Card
        variant={isPopular ? 'gradient' : 'elevated'}
        hover
        padding="lg"
        className={`h-full flex flex-col relative ${isPopular ? 'border-brand-500/50 shadow-glow-lg' : ''}`}
      >
        {isPopular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500 text-white text-xs font-medium">
              Most Popular
            </span>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="font-display text-5xl font-bold text-white">{formatPrice(plan.price)}</span>
            {!isLifetime && (
              <span className="text-surface-500">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
            )}
            {isLifetime && <span className="text-surface-500 text-sm ml-1">one-time</span>}
          </div>
          <p className="text-surface-500 text-sm">
            {isLifetime ? 'Pay once, use forever' : `Billed ${interval}`}
          </p>
        </div>

        <h3 className="font-display text-xl font-bold text-white mb-2">{plan.name}</h3>
        <p className="text-surface-500 text-sm mb-8">{isLifetime ? 'The ultimate investment in your career' : 'Perfect for active job seekers'}</p>

        <ul className="space-y-3 mb-8 flex-1">
          {[
            'Unlimited Screen Captures',
            'Unlimited Interview Sessions',
            'Resume Context Integration',
            'Cheat Sheet Overlay (Alt+N)',
            'Practice Room Access',
            'Session History & Analytics',
            'Priority Email Support',
            isLifetime ? 'Unlimited Device Activations' : '1 Device Activation',
            isLifetime ? 'Lifetime Updates' : null,
            isLifetime ? 'Direct Developer Access' : null,
            isLifetime ? 'Custom Integration Support' : null,
          ].filter(Boolean).map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-surface-300">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-auto">
          <Button
            className="w-full"
            size="lg"
            variant={isPopular ? 'primary' : 'secondary'}
            onClick={() => onPurchase(plan)}
          >
            {plan.cta_text}
          </Button>

          <div className="h-10 mt-4 flex items-center justify-center">
            {!isPopular && !isLifetime && (
              <motion.p className="text-center text-surface-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                Or <span className="text-brand-400 font-medium">upgrade to Lifetime</span> for unlimited access forever
              </motion.p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
