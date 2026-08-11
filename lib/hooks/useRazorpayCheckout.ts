'use client';

import { useCallback, useState } from 'react';
import { loadRazorpayScript, RazorpayOptions, RAZORPAY_PLANS } from '@/lib/razorpay';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

function cleanupRazorpayOverlay() {
  // Let Razorpay's SDK handle its own DOM node removal to avoid breaking subsequent clicks.
  // Just reset the overflow in case Razorpay leaves the scroll locked.
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

export function useRazorpayCheckout() {
  const [authRequired, setAuthRequired] = useState(false);

  const closeAuthPrompt = useCallback(() => setAuthRequired(false), []);

  const openCheckout = useCallback(async (options: {
    plan_id: string;
    interval: 'monthly' | 'yearly' | 'lifetime';
    email?: string;
    coupon?: string;
    discountPercent?: number;
    oneTime?: boolean;
  }) => {
    let userEmail: string | undefined;
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      userEmail = data?.user?.email;
      if (!data?.user) {
        setAuthRequired(true);
        return;
      }
    } catch (err) {
      console.error(err);
      setAuthRequired(true);
      return;
    }

    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      toast.error('Payments are not configured yet. Please try again later.');
      return;
    }
    if (!options.plan_id) {
      toast.error('This payment plan is not configured. Please try again later.');
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error('Failed to load payment system. Please refresh and try again.');
      return;
    }

    let razorpayOptions: RazorpayOptions;

    try {
      const loadingToast = toast.loading('Initiating secure checkout...');
      
      const res = await fetch('/api/create-payment-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: options.plan_id,
          interval: options.interval,
          coupon: options.coupon,
          one_time: options.oneTime,
        }),
      });
      
      const data = await res.json();
      toast.dismiss(loadingToast);

      if (!data.success) {
        toast.error(data.error || 'Failed to create payment session. Please try again.');
        return;
      }

      const discount = options.discountPercent ?? 0;
      const basePrice =
        options.interval === 'monthly'
          ? RAZORPAY_PLANS.pro_monthly.price
          : options.interval === 'yearly'
            ? RAZORPAY_PLANS.pro_yearly.price
            : RAZORPAY_PLANS.lifetime.price;

      razorpayOptions = {
        key,
        amount:
          options.interval === 'lifetime' || options.oneTime
            ? Math.round((basePrice * (100 - discount)) / 100)
            : 0,
        currency: 'INR',
        name: 'Hirebotai',
        description:
          options.interval === 'lifetime'
            ? 'Lifetime Pro — One-time payment'
            : options.oneTime
              ? `Pro ${options.interval} — One-time payment`
              : `Pro ${options.interval} — Subscription`,
        order_id: data.order_id,
        subscription_id: data.subscription_id,
        prefill: {
          email: options.email ?? userEmail,
        },
        theme: {
          color: '#8B5CF6',
        },
        handler: (response) => {
          cleanupRazorpayOverlay();
          // Redirect to download page with payment info
          const params = new URLSearchParams();
          params.set('payment_id', response.razorpay_payment_id);
          if (response.razorpay_subscription_id) {
            params.set('subscription_id', response.razorpay_subscription_id);
          }
          if (response.razorpay_order_id) {
            params.set('order_id', response.razorpay_order_id);
          }
          params.set('plan', options.interval);
          window.location.href = `/download?${params.toString()}`;
        },
        modal: {
          ondismiss: () => {
            cleanupRazorpayOverlay();
            toast.info('Checkout cancelled. You can try again anytime.');
          },
        },
      };

    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Network error. Please try again later.');
      return;
    }

    let rzp: any;
    try {
      rzp = new window.Razorpay(razorpayOptions);
    } catch (err) {
      cleanupRazorpayOverlay();
      toast.error('Could not start the payment window. Please refresh and try again.');
      return;
    }

    rzp.on('payment.failed', (response: any) => {
      const description =
        response?.error?.description || 'Your payment was declined by the bank or issuer.';
      toast.error(`Payment failed: ${description}`);
    });

    try {
      rzp.open();
    } catch (err) {
      cleanupRazorpayOverlay();
      toast.error('Could not open the payment window. Please refresh and try again.');
    }
  }, [setAuthRequired]);

  return { openCheckout, authRequired, closeAuthPrompt };
}
