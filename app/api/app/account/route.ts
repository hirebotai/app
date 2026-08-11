import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getUserFromBearer } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromBearer(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const [{ data: trial }, { data: licenses }] = await Promise.all([
      supabaseAdmin()
        .from('trials')
        .select('trial_start')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabaseAdmin()
        .from('licenses')
        .select('plan_type, status, license_key')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle(),
    ]);

    const trialStart = trial?.trial_start ? Number(trial.trial_start) : null;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email ?? '',
        name: (user.user_metadata as { name?: string } | null)?.name ?? '',
      },
      trial: {
        trial_start: trialStart,
        trial_active: trialStart !== null && Date.now() - trialStart < TRIAL_MS,
      },
      license: licenses
        ? {
            plan: licenses.plan_type,
            status: licenses.status,
            license_key: licenses.license_key,
          }
        : null,
    });
  } catch (err) {
    console.error('Account GET error:', err);
    return NextResponse.json({ error: 'Failed to load account.' }, { status: 500 });
  }
}
