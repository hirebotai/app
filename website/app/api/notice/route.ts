import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notice?v=1.17.8.26
 *
 * Returns the current in-app announcement and update availability.
 *
 * Source of truth: the `notices` table (edited live from the admin panel —
 * Vercel's filesystem is read-only so public/notice.json cannot be rewritten
 * at runtime). If the table is empty/missing we fall back to /public/notice.json.
 *
 * Rules applied server-side:
 *   - announcement is dropped when valid_until (YYYY-MM-DD) has passed
 *   - update is dropped when the installed version (query param v) is
 *     already >= the announced update version
 */

function applyRules(announcement: any, update: any, installedVersion: string) {
  let ann = announcement ?? null;
  let upd = update ?? null;

  if (ann) {
    const validUntil = typeof ann.valid_until === 'string' ? ann.valid_until : '';
    if (validUntil) {
      const expiry = new Date(validUntil + 'T23:59:59Z').getTime();
      if (!Number.isNaN(expiry) && expiry < Date.now()) {
        ann = null;
      }
    }
  }

  if (upd) {
    const version = upd.version;
    const url = upd.url;
    if (version && url && installedVersion) {
      if (!isNewerVersion(version, installedVersion)) {
        upd = null;
      }
    }
  }

  return { announcement: ann, update: upd };
}

function isNewerVersion(candidate: string, installed: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
  const a = parse(candidate);
  const b = parse(installed);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return false;
}

export async function GET(request: NextRequest) {
  const installedVersion = request.nextUrl.searchParams.get('v') ?? '';

  // 1. Try the notices table first (admin-editable, works on read-only hosts).
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'
    );
    const { data, error } = await supabaseAdmin.from('notices').select('*');
    if (!error && Array.isArray(data) && data.length > 0) {
      const announcementRow = data.find((r) => r.id === 'announcement');
      const updateRow = data.find((r) => r.id === 'update');
      const announcement = announcementRow
        ? {
            id: announcementRow.announcement_id ?? announcementRow.title,
            title: announcementRow.title,
            body: announcementRow.body,
            url: announcementRow.url,
            icon: announcementRow.icon,
            valid_until: announcementRow.valid_until,
          }
        : null;
      const update = updateRow
        ? {
            version: updateRow.version,
            url: updateRow.url,
            notes: updateRow.notes,
          }
        : null;
      return NextResponse.json({
        success: true,
        ...applyRules(announcement, update, installedVersion),
      });
    }
    if (error) console.error('notices table read error:', error.message);
  } catch (err) {
    console.error('notices table read error:', err);
  }

  // 2. Fallback: committed /public/notice.json (still useful before migration).
  let config: { announcement?: unknown; update?: unknown } = {};
  try {
    const filePath = path.join(process.cwd(), 'public', 'notice.json');
    config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('notice.json read error:', err);
    return NextResponse.json({ success: true, announcement: null, update: null });
  }

  const { announcement, update } = applyRules(config.announcement, config.update, installedVersion);
  return NextResponse.json({ success: true, announcement, update });
}
