// PATH: move-dashboard/src/app/api/join/route.ts

import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function endedCheck(ev: any) {
  const now = Date.now();
  const endTs = ev?.end_at ? new Date(ev.end_at).getTime() : null;
  return ev?.status === 'ended' || !!ev?.ended_at || (endTs ? now >= endTs : false);
}

const SELECT =
  'event_id, title, status, start_at, end_at, ended_at, cover_url, code, short_code';

// Try multiple strategies: eq(code), eq(short_code), ilike(code), ilike(short_code)
async function fetchEventByCode(
  sb: SupabaseClient<any, 'public', any>,
  raw: string
) {
  const code = (raw ?? '').trim();
  const upper = code.toUpperCase();

  // 1) exact code
  let r = await sb.from('events').select(SELECT).eq('code', code).limit(1).maybeSingle();
  if (r.data) return r.data;

  // 2) exact short_code
  r = await sb.from('events').select(SELECT).eq('short_code', code).limit(1).maybeSingle();
  if (r.data) return r.data;

  // 3) case-insensitive on code
  r = await sb.from('events').select(SELECT).ilike('code', upper).limit(1).maybeSingle();
  if (r.data) return r.data;

  // 4) case-insensitive on short_code
  r = await sb.from('events').select(SELECT).ilike('short_code', upper).limit(1).maybeSingle();
  if (r.data) return r.data;

  return null;
}

async function handleJoin(params: { code?: string | null; event_id?: string | null }) {
  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(SUPA_URL, SUPA_KEY);

  const code = params.code?.trim() || null;
  const event_id = params.event_id || null;

  if (!code && !event_id) {
    return NextResponse.json({ ok: false, error: 'code or event_id required' }, { status: 400 });
  }

  let ev: any = null;

  if (code) {
    ev = await fetchEventByCode(supabase, code);
  } else {
    const { data } = await supabase
      .from('events')
      .select(SELECT)
      .eq('event_id', event_id!)
      .limit(1)
      .maybeSingle();
    ev = data ?? null;
  }

  if (!ev) {
    return NextResponse.json(
      { ok: false, error: 'Event not found', debug: { supabaseUrl: SUPA_URL } },
      { status: 404 }
    );
  }

  const normalizedCode = ev.code || ev.short_code || null;

if (endedCheck(ev)) {
  // 1) Get top 10 scores for the event (no join)
  const { data: top, error: scoreErr } = await supabase
    .from('scores')
    .select('user_id, score')
    .eq('event_id', ev.event_id)
    .order('score', { ascending: false })
    .limit(10);

  if (scoreErr) {
    return NextResponse.json({ ok: false, error: scoreErr.message }, { status: 400 });
  }

  // 2) Fetch profiles for those users in one shot
  const userIds = (top ?? []).map(r => r.user_id);
  let profMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profs, error: profErr } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    if (profErr) {
      return NextResponse.json({ ok: false, error: profErr.message }, { status: 400 });
    }

    for (const p of profs ?? []) {
      profMap[p.user_id] = {
        display_name: p.display_name ?? null,
        avatar_url: p.avatar_url ?? null,
      };
    }
  }

  const top10 = (top ?? []).map((r, i) => {
    const p = profMap[r.user_id] || { display_name: null, avatar_url: null };
    return {
      rank: i + 1,
      user_id: r.user_id,
      name: p.display_name ?? 'Player',
      avatar_url: p.avatar_url,
      score: Number(r.score ?? 0),
    };
  });

  const normalizedCode = ev.code || ev.short_code || null;

  return NextResponse.json({
    ok: false,
    joinable: false,
    reason: 'ended',
    event_id: ev.event_id,
    code: normalizedCode,
    event: { id: ev.event_id, title: ev.title, cover_url: ev.cover_url, code: normalizedCode },
    top10,
    version: 'join-v5',
  });
}

  return NextResponse.json({
    ok: true,
    joinable: true,
    event_id: ev.event_id,
    code: normalizedCode,
    event: { id: ev.event_id, title: ev.title, cover_url: ev.cover_url, code: normalizedCode },
    version: 'join-v4',
    debug: { supabaseUrl: SUPA_URL },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return handleJoin({ code: body?.code, event_id: body?.event_id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    return handleJoin({
      code: url.searchParams.get('code'),
      event_id: url.searchParams.get('event_id'),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
