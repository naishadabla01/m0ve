// PATH: src/app/api/events/status/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // anon is fine for read
const sb  = createClient(url, key, { auth: { persistSession: false } });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get('event_id')?.trim() || null;
    let code       = searchParams.get('code')?.trim() || null;

    // 🔧 If we received only event_id, resolve its short code
    if (!code && event_id) {
      const { data: ev, error: evErr } = await sb
        .from('events')
        .select('code')
        .eq('event_id', event_id)
        .maybeSingle();
      if (evErr) throw evErr;
      code = ev?.code ?? null;
    }

    if (!code) {
      return NextResponse.json({ ok: false, error: 'Invalid code' }, { status: 400 });
    }

    // …keep your existing logic that reads event status by code…
    // Return the same JSON shape you had before (no contract change).
    // Example stub (replace with your current implementation):
    return NextResponse.json({ ok: true, status: 'live', revalidate: 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
