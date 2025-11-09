// src/app/api/events/list/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') || 'mine';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: req.headers.get('authorization') || '' } } }
    );

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    let q = supabase
      .from('events')
      .select('event_id, name, title, short_code, code, start_at, end_at, ended_at, status, artist_id')
      .order('start_at', { ascending: false });

    if (scope === 'mine') q = q.eq('artist_id', user.id);
    if (scope === 'ongoing') {
  const nowISO = new Date().toISOString();
  q = q.neq('status', 'ended').or(`end_at.is.null,end_at.gt.${nowISO}`);
}
    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, events: data });
  } catch (e: any) {
    console.error('list route error:', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
