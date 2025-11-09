// PATH: move-dashboard/src/app/api/events/create/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function genCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: req.headers.get('authorization') || '' },
        },
      }
    );

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    let payload: any = null;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const title = (payload?.title ?? '').trim();
    const start_at_raw = payload?.start_at;
    const end_at_raw = payload?.end_at ?? null;
    const location = payload?.location ? String(payload.location).trim() : null;
    const cover_url = payload?.cover_url ? String(payload.cover_url).trim() : null;

    if (!title || !start_at_raw) {
      return NextResponse.json(
        { ok: false, error: 'title and start_at are required' },
        { status: 400 }
      );
    }

    const start_at = new Date(start_at_raw).toISOString();
    const end_at = end_at_raw ? new Date(end_at_raw).toISOString() : null;

    // 👇 generate once, then write to BOTH columns for compatibility
    const code = genCode(6);

    const insert = {
      title,
      name: title,
      start_at,
      end_at,
      created_by: user.id,
      artist_id: user.id,
      code,                 // used by new flows
      short_code: code,     // backward compatibility (this is the new line)
      status: 'live',
      location,
      cover_url,
    };

    const { data, error } = await supabase
      .from('events')
      .insert(insert)
      .select('event_id, code, short_code')  // optional: return short_code too
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, event: data });
  } catch (e: any) {
    console.error('create-event route error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}
