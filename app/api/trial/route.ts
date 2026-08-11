import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, publicLimiter } from '@/lib/rateLimit';

// Initialize Supabase admin client using service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

export async function POST(request: NextRequest) {
  if (!publicLimiter.check(getClientIp(request))) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Please wait a minute and try again.' },
      { status: 429 }
    );
  }
  try {
    const { hwid } = await request.json();

    if (!hwid || typeof hwid !== 'string' || hwid.trim().length < 8) {
      return NextResponse.json({ success: false, error: 'A valid device HWID is required.' }, { status: 400 });
    }

    // Normalize so the same device always resolves to the same record
    const normalized = hwid.trim().toUpperCase();

    // Existing trial record -> return its start time (authoritative)
    const { data: existing } = await supabaseAdmin
      .from('trials')
      .select('trial_start')
      .eq('hwid', normalized)
      .maybeSingle();

    if (existing && existing.trial_start) {
      return NextResponse.json({
        success: true,
        trial_start: Number(existing.trial_start),
        new: false,
      });
    }

    // First time this device asks -> start the trial now
    const trialStart = Date.now();
    await supabaseAdmin
      .from('trials')
      .upsert({
        hwid: normalized,
        trial_start: trialStart,
      });

    return NextResponse.json({
      success: true,
      trial_start: trialStart,
      new: true,
    });
  } catch (err) {
    console.error('Trial API error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
