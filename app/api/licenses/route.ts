import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { errorMessage } from '@/lib/errors';
import { getClientIp, writeLimiter, publicLimiter } from '@/lib/rateLimit';
import { supabaseAdmin, requireAdmin } from '@/lib/supabase/admin';

const createLicenseSchema = z.object({
  email: z.string().email(),
  planType: z.enum(['monthly', 'yearly', 'lifetime']),
});

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!publicLimiter.check(getClientIp(request))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const { data, error } = await supabaseAdmin()
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ licenses: data ?? [] });
  } catch (err) {
    console.error('Licenses GET error:', err);
    return NextResponse.json({ error: `Failed to load licenses: ${errorMessage(err)}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!writeLimiter.check(getClientIp(request))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = createLicenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 422 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const planType = parsed.data.planType;

  try {
    const { data: keyResult, error: keyError } = await supabaseAdmin().rpc('generate_license_key');
    if (keyError) throw keyError;
    if (!keyResult) throw new Error('Could not generate a license key');

    let userId: string | null = null;
    try {
      const { data: users } = await supabaseAdmin().auth.admin.listUsers({ perPage: 1000 });
      const match = users?.users?.find((u) => u.email?.toLowerCase() === email);
      if (match) userId = match.id;
    } catch (err) {
      console.error('License user lookup error:', err);
    }

    const expiresAt =
      planType === 'lifetime'
        ? null
        : new Date(Date.now() + (planType === 'yearly' ? 365 : 30) * 86400000).toISOString();

    const { data, error } = await supabaseAdmin()
      .from('licenses')
      .insert({
        license_key: keyResult,
        user_id: userId,
        email,
        plan_type: planType,
        status: 'active',
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ license: data });
  } catch (err) {
    console.error('Licenses POST error:', err);
    return NextResponse.json({ error: `Failed to create license: ${errorMessage(err)}` }, { status: 500 });
  }
}
