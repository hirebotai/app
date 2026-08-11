export type Edition = 'trial' | 'pro' | 'lifetime';

export type LicenseStatus = 'active' | 'revoked' | 'expired';

export interface LicenseKey {
  id: string;
  key_hash: string;
  key_prefix: string;
  edition: Edition;
  status: LicenseStatus;
  max_activations: number;
  current_activations: number;
  expires_at: string | null;
  stripe_customer_id: string | null;
  razorpay_subscription_id: string | null;
  razorpay_payment_id: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activation {
  id: string;
  license_key_id: string;
  hw_id_hash: string;
  machine_name: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  activated_at: string;
  last_seen_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  default_license_id: string | null;
  created_at: string;
}

export interface LicenseValidationResponse {
  valid: boolean;
  token?: string;
  features?: string[];
  expires_at?: string;
  error?: string;
  edition?: Edition;
}

export interface LicenseActivateRequest {
  key: string;
  hw_id: string;
  machine_name?: string;
}

export interface LicenseValidateRequest {
  key: string;
  hw_id: string;
}

export interface Plan {
  id: string;
  name: string;
  edition: Edition;
  price_monthly: number; // in paise
  price_yearly: number;  // in paise
  price_lifetime: number; // in paise
  razorpay_plan_id_monthly: string;
  razorpay_plan_id_yearly: string;
  features: string[];
  cta_text: string;
  popular?: boolean;
}

export interface CheckoutSessionRequest {
  plan_id: string;
  interval: 'monthly' | 'yearly';
  email?: string;
}

export interface WebhookEvent {
  event: string;
  payload: {
    payment: {
      entity: RazorpayPayment;
    };
    subscription?: {
      entity: RazorpaySubscription;
    };
  };
}

export interface RazorpayPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  email: string;
  contact: string;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: string;
  current_start: number;
  current_end: number;
  ended_at: number | null;
  notes: Record<string, string>;
}