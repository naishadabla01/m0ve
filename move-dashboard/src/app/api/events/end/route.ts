// move-dashboard/src/app/api/events/end/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: req.headers.get('authorization') || '' } } }
    );

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id, code } = await req.json().catch(() => ({}));
    if (!event_id && !code) {
      return NextResponse.json({ ok: false, error: 'event_id or code is required' }, { status: 400 });
    }

    // Only allow ending your own event
    const q = supabase.from('events').select('event_id,status').eq('artist_id', user.id);
    const { data: ev, error: fetchErr } = event_id
      ? await q.eq('event_id', event_id).single()
      : await q.eq('code', code).single();

    if (fetchErr || !ev) {
      return NextResponse.json({ ok: false, error: 'Event not found' }, { status: 404 });
    }
    if (ev.status === 'ended') {
      return NextResponse.json({ ok: true, alreadyEnded: true, event_id: ev.event_id });
    }

    const { data, error: updErr } = await supabase
      .from('events')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('event_id', ev.event_id)
      .select('event_id,status,ended_at')
      .single();

    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, event: data });
  } catch (e: any) {
    console.error('end-event route error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
