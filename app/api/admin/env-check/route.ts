import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, publicLimiter } from '@/lib/rateLimit';
import { requireAdmin } from '@/lib/supabase/admin';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function keyInfo(key: string | undefined): { set: boolean; length: number; role: string | null } {
  if (!key) return { set: false, length: 0, role: null };
  const payload = decodeJwtPayload(key.trim());
  return { set: true, length: key.trim().length, role: (payload?.role as string) ?? null };
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!publicLimiter.check(getClientIp(request))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let live: { ok: boolean; error?: string } = { ok: false, error: 'client not created' };
  try {
    const client = createClient(
      url || 'https://placeholder.supabase.co',
      service?.trim() || 'placeholder_key'
    );
    const { data, error } = await client.auth.admin.listUsers({ perPage: 1 });
    live = error ? { ok: false, error: error.message } : { ok: true, error: `${data.users.length} user(s)` };
  } catch (err) {
    live = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  let host: string | null = null;
  try {
    host = url ? new URL(url).host : null;
  } catch {
    host = 'INVALID URL';
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    supabaseUrlSet: Boolean(url),
    supabaseUrlHost: host,
    serviceRoleKey: keyInfo(service),
    anonKey: keyInfo(anon),
    razorpayKeyIdSet: Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID),
    resendKeySet: Boolean(process.env.RESEND_API_KEY),
    live,
  });
}
