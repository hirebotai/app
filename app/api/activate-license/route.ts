import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, publicLimiter } from '@/lib/rateLimit';

// Initialize Supabase admin client using service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'
);

export async function POST(request: NextRequest) {
  if (!publicLimiter.check(getClientIp(request))) {
    return NextResponse.json(
      { success: false, error: 'Too many activation attempts. Please wait a minute and try again.' },
      { status: 429 }
    );
  }
  try {
    const { license_key, hwid } = await request.json();

    if (!license_key || !license_key.startsWith('SA-') || license_key.length < 12) {
      return NextResponse.json({ success: false, error: 'Invalid license key format.' }, { status: 400 });
    }

    if (!hwid) {
      return NextResponse.json({ success: false, error: 'Hardware Device ID (HWID) is required.' }, { status: 400 });
    }

    // Lookup license key in Supabase database
    const { data: license, error } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .single();

    if (error || !license) {
      return NextResponse.json({ success: false, error: 'License key not found or invalid.' }, { status: 404 });
    }

    // Check if license is revoked or expired
    if (license.status !== 'active') {
      return NextResponse.json({ success: false, error: 'License key has been revoked or expired.' }, { status: 403 });
    }

    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'License key has expired. Please renew your subscription.' }, { status: 403 });
    }

    // HWID Binding Check
    if (!license.hwid) {
      // First activation: bind this hardware device UUID to the license
      await supabaseAdmin
        .from('licenses')
        .update({ hwid: hwid, activated_at: new Date().toISOString() })
        .eq('id', license.id);

      return NextResponse.json({
        success: true,
        message: 'License successfully activated and bound to this PC.'
      });
    }

    if (license.hwid === hwid) {
      // Matching device UUID
      return NextResponse.json({
        success: true,
        message: 'License active on this PC.'
      });
    }

    // Hardware ID mismatch: key activated on another PC
    return NextResponse.json({
      success: false,
      error: 'This license key is already bound to another computer. Contact support to transfer your license.'
    }, { status: 409 });

  } catch (err) {
    console.error('License activation API error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error during verification.' }, { status: 500 });
  }
}
