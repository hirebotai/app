import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { RAZORPAY_PLANS } from '@/lib/razorpay';
import {
  couponAdminClient,
  validateCoupon,
  incrementCouponUsage,
  discountedAmount,
} from '@/lib/coupons';

// Lazy singleton: constructing Razorpay at module scope throws during Next.js
// "Collecting page data" when env vars are absent at build time.
let _razorpay: Razorpay | null = null;
function getRazorpay(): Razorpay {
  if (!_razorpay) {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials are not configured.');
    }
    _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _razorpay;
}

export async function POST(request: NextRequest) {
  try {
    const { plan_id, interval, coupon, one_time } = await request.json();
    const razorpay = getRazorpay();

    if (!plan_id) {
      return NextResponse.json({ success: false, error: 'plan_id is required' }, { status: 400 });
    }

    let discountPercent = 0;
    let couponCode: string | null = null;
    if (coupon) {
      const result = await validateCoupon(couponAdminClient(), coupon);
      if (!result.valid) {
        return NextResponse.json(
          { success: false, error: result.message || 'Invalid coupon.' },
          { status: 400 }
        );
      }
      const applicablePlans = result.coupon!.applicable_plans ?? ['monthly', 'yearly', 'lifetime'];
      if (!applicablePlans.includes(interval)) {
        const names = applicablePlans
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(', ');
        return NextResponse.json(
          {
            success: false,
            error: `This coupon is only valid for: ${names}.`,
          },
          { status: 400 }
        );
      }
      discountPercent = result.coupon!.discount_percent;
      couponCode = result.coupon!.code;
    }

    if (interval === 'lifetime') {
      // Lifetime is a one-time payment, so we create an Order instead of a Subscription
      const order = await razorpay.orders.create({
        amount: discountedAmount(RAZORPAY_PLANS.lifetime.price, discountPercent),
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      });
      if (couponCode) await incrementCouponUsage(couponAdminClient(), couponCode);
      return NextResponse.json({
        success: true,
        order_id: order.id,
        discountPercent,
        one_time: true,
      });
    } else if (one_time) {
      // One-time month/year pass — a single non-recurring payment
      const base =
        interval === 'monthly'
          ? RAZORPAY_PLANS.pro_monthly.price
          : RAZORPAY_PLANS.pro_yearly.price;
      const order = await razorpay.orders.create({
        amount: discountedAmount(base, discountPercent),
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      });
      if (couponCode) await incrementCouponUsage(couponAdminClient(), couponCode);
      return NextResponse.json({
        success: true,
        order_id: order.id,
        discountPercent,
        one_time: true,
      });
    } else {
      // Monthly or Yearly auto-renew Subscriptions do not support coupons.
      // Coupons apply only to One-time and Lifetime purchases.
      if (couponCode) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Coupons can only be applied to One-time and Lifetime purchases. Switch to One-time payment to use your coupon.',
          },
          { status: 400 }
        );
      }
      const subscription = await razorpay.subscriptions.create({
        plan_id,
        customer_notify: 1,
        total_count: interval === 'monthly' ? 120 : 100,
      });
      return NextResponse.json({
        success: true,
        subscription_id: subscription.id,
      });
    }
  } catch (error: any) {
    console.error('Error creating payment session:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create payment session' }, { status: 500 });
  }
}
