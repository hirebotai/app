import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notice?v=2.0.0
 *
 * Returns the current in-app announcement and update availability.
 * Config lives in /public/notice.json (editable without code changes).
 *   announcement: { id, title, body, url, valid_until? } | null
 *   update:       { version, url, notes? } | null
 *
 * Rules applied server-side:
 *   - announcement is dropped when valid_until (YYYY-MM-DD) has passed
 *   - update is dropped when the installed version (query param v) is
 *     already >= the announced update version
 */
export async function GET(request: NextRequest) {
  const installedVersion = request.nextUrl.searchParams.get('v') ?? '';

  let config: { announcement?: unknown; update?: unknown } = {};
  try {
    const filePath = path.join(process.cwd(), 'public', 'notice.json');
    config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('notice.json read error:', err);
    return NextResponse.json({ success: false, error: 'Notice config unavailable' }, { status: 500 });
  }

  let announcement = null;
  if (config.announcement && typeof config.announcement === 'object') {
    const ann = config.announcement as Record<string, unknown>;
    if (ann.title) {
      const validUntil = typeof ann.valid_until === 'string' ? ann.valid_until : '';
      if (validUntil) {
        const expiry = new Date(validUntil + 'T23:59:59Z').getTime();
        if (!Number.isNaN(expiry) && expiry < Date.now()) {
          announcement = null;
        } else {
          announcement = ann;
        }
      } else {
        announcement = ann;
      }
    }
  }

  let update = null;
  if (config.update && typeof config.update === 'object') {
    const upd = config.update as { version?: string; url?: string; notes?: string };
    if (upd.version && upd.url && installedVersion) {
      if (isNewerVersion(upd.version, installedVersion)) {
        update = upd;
      }
    } else if (upd.version && upd.url) {
      update = upd;
    }
  }

  return NextResponse.json({ success: true, announcement, update });
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
