declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  razorpay_subscription_id?: string;
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(options: RazorpayOptions): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error('Failed to load Razorpay SDK');
  }

  const rzp = new window.Razorpay(options);
  rzp.open();
}

export const RAZORPAY_PLANS = {
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    edition: 'pro' as const,
    price: 14900, // ₹149 in paise
    interval: 'monthly' as const,
    razorpay_plan_id: process.env.NEXT_PUBLIC_RAZORPAY_PLAN_PRO_MONTHLY || '',
    features: [
      'Unlimited screen captures',
      'Unlimited interview sessions',
      'Resume context integration',
      'Cheat sheet overlay (Alt+N)',
      'Practice room access',
      'Session history & analytics',
      'Priority email support',
      '1 device activation',
    ],
    cta_text: 'Start Monthly',
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: 'Pro Yearly',
    edition: 'pro' as const,
    price: 149900, // ₹1,499 in paise (16% off)
    interval: 'yearly' as const,
    razorpay_plan_id: process.env.NEXT_PUBLIC_RAZORPAY_PLAN_PRO_YEARLY || '',
    features: [
      'Everything in Monthly',
      'Save ₹289/year',
      'Priority feature requests',
      'Early beta access',
      '1 device activation',
    ],
    cta_text: 'Start Yearly (Save 16%)',
    popular: true,
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime Pro',
    edition: 'lifetime' as const,
    price: 499900, // ₹4,999 in paise
    interval: 'lifetime' as const,
    razorpay_plan_id: process.env.NEXT_PUBLIC_RAZORPAY_PLAN_LIFETIME || '',
    features: [
      'Everything in Yearly',
      'One-time payment, forever',
      'Unlimited device activations',
      'Lifetime updates',
      'Direct developer access',
      'Custom integration support',
    ],
    cta_text: 'Buy Lifetime',
  },
} as const;

export type PlanId = keyof typeof RAZORPAY_PLANS;