import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/env';

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 422 }
    );
  }

  const { data, error } = await supabaseAdmin().auth.refreshSession({
    refresh_token: parsed.data.refresh_token,
  });

  if (error || !data.session) {
    return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user?.id ?? '',
      email: data.user?.email ?? '',
      name: (data.user?.user_metadata as { name?: string } | null)?.name ?? '',
    },
  });
}
