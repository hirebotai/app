import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'
);

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload.payload.payment.entity;
      const email = payment.email;
      const amount = payment.amount;

      // 1. Generate unique key SA-XXXX-XXXX-XXXX
      const randomHex = crypto.randomBytes(6).toString('hex').toUpperCase();
      const licenseKey = `SA-${randomHex.slice(0,4)}-${randomHex.slice(4,8)}-${randomHex.slice(8,12)}`;

      // 2. Determine plan from amount (paise): monthly ₹149, yearly ₹1,499, lifetime ₹4,999
      const planType = amount >= 499900 ? 'lifetime' : amount >= 149900 ? 'yearly' : 'monthly';
      const expiresAt =
        planType === 'lifetime'
          ? null
          : new Date(Date.now() + (planType === 'yearly' ? 365 : 30) * 86400000).toISOString();

      // 3. Link to auth user by email (if the account exists)
      let userId: string | null = null;
      try {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const match = users?.users?.find((u) => u.email?.toLowerCase() === email?.toLowerCase());
        if (match) userId = match.id;
      } catch (err) {
        console.error('Webhook user lookup error:', err);
      }

      // 4. Insert into Supabase licenses table (email + plan_type columns)
      const { error: insertError } = await supabaseAdmin.from('licenses').insert({
        license_key: licenseKey,
        user_id: userId,
        email: email,
        plan_type: planType,
        status: 'active',
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      });
      if (insertError) {
        console.error('License insert error:', insertError.message);
        return NextResponse.json({ error: 'Failed to create license' }, { status: 500 });
      }

      // 3. Send email with key via Resend API
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'Hirebotai <noreply@hirebotai.in>',
            to: [email],
            subject: '⚡ Your Hirebotai License Key & Download Link',
            html: `
              <h2>Welcome to Hirebotai Pro!</h2>
              <p>Thank you for your purchase. Here is your license key:</p>
              <h1 style="color: #8B5CF6; font-family: monospace;">${licenseKey}</h1>
              <p>Download the app: <a href="https://hirebotai.in/download">https://hirebotai.in/download</a></p>
            `,
          }),
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
