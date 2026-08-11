import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createCookieClient } from './server';

let adminClient: SupabaseClient | null = null;

/** Service-role client. Never expose this to the browser. */
export function supabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;
  adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || 'placeholder_key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  );
  return adminClient;
}

/** Resolves a user from an Authorization: Bearer <token> header, or null. */
export async function getUserFromBearer(
  authorization: string | null | undefined
) {
  if (!authorization || !authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return null;
  const {
    data: { user },
    error,
  } = await supabaseAdmin().auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/** Returns true if a user already exists with the given email (case-insensitive). */
export async function emailExists(email: string): Promise<boolean> {
  const target = email.toLowerCase();
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data } = await supabaseAdmin().auth.admin.listUsers({ page, perPage });
    const users = data?.users ?? [];
    if (users.some((u) => u.email?.toLowerCase() === target)) return true;
    if (users.length < perPage) break;
  }
  return false;
}

/** Returns true if the email belongs to an admin (ADMIN_EMAILS env, comma-separated). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? 'satya@hirebotai.in')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/** Returns the logged-in admin user (cookie session), or null. */
export async function getAdminUser() {
  try {
    const supabase = await createCookieClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return isAdminEmail(user.email) ? user : null;
  } catch {
    return null;
  }
}

/** API-route guard: returns a 401 response when the caller is not an admin, else null. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
  }
  return null;
}
