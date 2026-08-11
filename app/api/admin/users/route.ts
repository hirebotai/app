import { NextRequest, NextResponse } from 'next/server';
import { errorMessage } from '@/lib/errors';
import { getClientIp, publicLimiter } from '@/lib/rateLimit';
import { supabaseAdmin, requireAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!publicLimiter.check(getClientIp(request))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const { data: usersPage, error: usersError } = await supabaseAdmin().auth.admin.listUsers({
      perPage: 1000,
    });
    if (usersError) throw usersError;

    const { data: licenses, error: licensesError } = await supabaseAdmin()
      .from('licenses')
      .select('user_id, plan_type, hwid, status');
    if (licensesError) throw licensesError;

    const { data: trials, error: trialsError } = await supabaseAdmin()
      .from('trials')
      .select('user_id, trial_start, hwid');
    if (trialsError) throw trialsError;

    const planMap: Record<string, string> = {};
    const licenseHwidMap: Record<string, string> = {};
    for (const l of licenses ?? []) {
      if (l.user_id && !planMap[l.user_id]) {
        planMap[l.user_id] = l.plan_type;
        if (l.hwid) licenseHwidMap[l.user_id] = l.hwid;
      }
    }

    const trialMap: Record<string, number> = {};
    const trialHwidMap: Record<string, string> = {};
    for (const t of trials ?? []) {
      if (t.user_id && !trialMap[t.user_id]) {
        trialMap[t.user_id] = Number(t.trial_start);
        if (t.hwid) trialHwidMap[t.user_id] = t.hwid;
      }
    }

    const users = (usersPage?.users ?? []).map((u) => {
      const metadataName = (u.user_metadata as { name?: string } | null)?.name;
      const bannedAt = (u as { banned_at?: string | null }).banned_at;
      const trialStart = trialMap[u.id] ?? null;
      const trialActive = trialStart !== null && Date.now() - trialStart < 3 * 24 * 60 * 60 * 1000;
      const hasLicense = !!planMap[u.id];
      return {
        id: u.id,
        email: u.email ?? '',
        name: metadataName || null,
        plan: hasLicense ? planMap[u.id] : trialStart ? 'trial' : 'No plan',
        status: bannedAt ? 'suspended' : 'active',
        joined: u.created_at,
        lastActive: u.last_sign_in_at ?? u.created_at,
        trialStart,
        trialActive,
        hwid: licenseHwidMap[u.id] ?? trialHwidMap[u.id] ?? null,
      };
    });

    // Append anonymous trials (devices that started a trial but never registered/logged in)
    const anonymousTrials = (trials ?? []).filter((t) => !t.user_id && t.hwid);
    for (const t of anonymousTrials) {
      const trialStart = Number(t.trial_start);
      const trialActive = Date.now() - trialStart < 3 * 24 * 60 * 60 * 1000;
      users.push({
        id: `anon_${t.hwid}`,
        email: 'Anonymous Device',
        name: null,
        plan: 'trial',
        status: 'active',
        joined: new Date(trialStart).toISOString(),
        lastActive: new Date(trialStart).toISOString(),
        trialStart,
        trialActive,
        hwid: t.hwid,
      });
    }

    return NextResponse.json({ users });
  } catch (err) {
    console.error('Users GET error:', err);
    return NextResponse.json({ error: `Failed to load users: ${errorMessage(err)}` }, { status: 500 });
  }
}
