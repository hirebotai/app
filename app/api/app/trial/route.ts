import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin, getUserFromBearer } from '@/lib/supabase/admin';
import { getClientIp, publicLimiter } from '@/lib/rateLimit';

const trialSchema = z.object({
  hwid: z.string().min(8, 'A valid device HWID is required.'),
});

export async function POST(request: NextRequest) {
  if (!publicLimiter.check(getClientIp(request))) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Please wait a minute and try again.' },
      { status: 429 }
    );
  }

  const user = await getUserFromBearer(request.headers.get('authorization'));
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = trialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
        { status: 400 }
      );
    }

    const normalized = parsed.data.hwid.trim().toUpperCase();

    // 1) Account-bound trial already exists -> authoritative.
    const { data: byUser, error: byUserError } = await supabaseAdmin()
      .from('trials')
      .select('trial_start')
      .eq('user_id', user.id)
      .maybeSingle();
    if (byUserError) {
      console.error('App trial read (by user) error:', byUserError);
      return NextResponse.json(
        { success: false, error: 'Could not read trial status.' },
        { status: 500 }
      );
    }
    if (byUser?.trial_start) {
      return NextResponse.json({
        success: true,
        trial_start: Number(byUser.trial_start),
        new: false,
      });
    }

    // 2) Device already has a trial record (legacy HWID-only, or bound to any
    //    account). The trial is device-keyed, so a fresh account on a used
    //    device still sees the original start time — no silent trial resets.
    const { data: byHwid, error: byHwidError } = await supabaseAdmin()
      .from('trials')
      .select('trial_start, user_id')
      .eq('hwid', normalized)
      .maybeSingle();
    if (byHwidError) {
      console.error('App trial read (by hwid) error:', byHwidError);
      return NextResponse.json(
        { success: false, error: 'Could not read trial status.' },
        { status: 500 }
      );
    }
    if (byHwid?.trial_start) {
      if (!byHwid.user_id) {
        const { error: bindError } = await supabaseAdmin()
          .from('trials')
          .update({ user_id: user.id, email: user.email })
          .eq('hwid', normalized);
        if (bindError) {
          console.error('App trial bind error:', bindError);
          return NextResponse.json({
            success: false,
            error: 'Failed to bind trial: ' + bindError.message,
          }, { status: 500 });
        }
      }
      return NextResponse.json({
        success: true,
        trial_start: Number(byHwid.trial_start),
        new: false,
      });
    }

    // 3) Fresh trial for this account + device. Only report success if the
    //    timestamp was actually persisted — otherwise the app would cache a
    //    fake "new" start and restart its 72h timer locally.
    const trialStart = Date.now();
    const { error: upsertError } = await supabaseAdmin().from('trials').upsert({
      hwid: normalized,
      user_id: user.id,
      email: user.email,
      trial_start: trialStart,
    });
    if (upsertError) {
      console.error('App trial upsert error:', upsertError);
      return NextResponse.json(
        { success: false, error: 'Could not record trial.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, trial_start: trialStart, new: true });
  } catch (err) {
    console.error('App trial error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
