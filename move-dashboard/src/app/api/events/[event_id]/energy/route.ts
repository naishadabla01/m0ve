// PATH: move-dashboard/src/app/api/events/[event_id]/energy/route.ts
// Produces per-time energy (summed across users), a cumulative series, and top peak windows.
// Works for live & ended events. Uses SERVICE_ROLE if available (preferred), else anon.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type SeriesPoint = { t: string; energy: number; cum: number };

function toISO(d: Date) {
  return new Date(d.getTime() - d.getMilliseconds()).toISOString();
}

function clampResolution(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 10) return 30;
  if (seconds > 600) return 600;
  return Math.round(seconds);
}

function clampWindow(mins: number) {
  if (!Number.isFinite(mins) || mins < 1) return 3;
  if (mins > 30) return 30;
  return Math.round(mins);
}

function floorToResolution(d: Date, sec: number) {
  const ms = Math.floor(d.getTime() / 1000 / sec) * sec * 1000;
  return new Date(ms);
}

export async function GET(
  _req: Request,
  { params }: { params: { event_id: string } }
) {
  try {
    const url = new URL(_req.url);
    const resolutionSec = clampResolution(parseInt(url.searchParams.get('resolutionSec') || '60', 10));
    const windowMin = clampWindow(parseInt(url.searchParams.get('windowMin') || '3', 10));

    // Prefer SERVICE_ROLE (bypasses RLS). Fallback to anon if missing.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
    );

    // 1) Load the event window
    const { data: ev, error: evErr } = await supabase
      .from('events')
      .select('event_id, start_at, end_at, ended_at, status')
      .eq('event_id', params.event_id)
      .single();

    if (evErr || !ev) {
      return NextResponse.json({ ok: false, error: 'Event not found' }, { status: 404 });
    }

    const start = new Date(ev.start_at);
    const end = new Date(ev.ended_at || ev.end_at || new Date());
    if (end.getTime() < start.getTime()) {
      end.setTime(start.getTime());
    }

    // 2) Pull motion buckets for this event (timestamp + sum_accel). We’ll aggregate in memory.
    //    NOTE: We only select the two needed columns to keep payload small.
    const { data: rows, error: mbErr } = await supabase
      .from('motion_buckets')
      .select('bucket_ts, sum_accel')
      .eq('event_id', params.event_id)
      .gte('bucket_ts', toISO(start))
      .lte('bucket_ts', toISO(end))
      .order('bucket_ts', { ascending: true });

    if (mbErr) {
      return NextResponse.json({ ok: false, error: mbErr.message }, { status: 400 });
    }

    // 3) Aggregate across users per time bucket at chosen resolution
    const perBucket = new Map<number, number>(); // key = epoch(ms) bucket start, value = sum energy

    for (const r of rows ?? []) {
      const ts = new Date(r.bucket_ts as string);
      const binStart = floorToResolution(ts, resolutionSec).getTime();
      const prev = perBucket.get(binStart) || 0;
      perBucket.set(binStart, prev + Number(r.sum_accel || 0));
    }

    // 4) Gap-fill from start..end at resolution
    const series: { t: number; energy: number }[] = [];
    let cursor = floorToResolution(start, resolutionSec).getTime();
    const endMs = floorToResolution(end, resolutionSec).getTime();
    const step = resolutionSec * 1000;

    while (cursor <= endMs) {
      series.push({ t: cursor, energy: perBucket.get(cursor) || 0 });
      cursor += step;
    }

    // 5) Cumulative sum
    let acc = 0;
    const cumSeries: SeriesPoint[] = series.map((p) => {
      acc += p.energy;
      return { t: new Date(p.t).toISOString(), energy: p.energy, cum: acc };
    });

    // 6) Top peak segments (rolling window)
    const windowPoints = Math.max(1, Math.round((windowMin * 60) / resolutionSec));
    type Window = { startIdx: number; endIdx: number; start: number; end: number; total: number };

    // Prefix sums for O(1) window sums
    const prefix: number[] = [0];
    for (const p of series) prefix.push(prefix[prefix.length - 1] + p.energy);

    function windowSum(i0: number, i1: number) {
      // inclusive range [i0, i1]
      return prefix[i1 + 1] - prefix[i0];
    }

    const windows: Window[] = [];
    if (series.length > 0) {
      for (let i = 0; i + windowPoints - 1 < series.length; i++) {
        const j = i + windowPoints - 1;
        const total = windowSum(i, j);
        windows.push({
          startIdx: i,
          endIdx: j,
          start: series[i].t,
          end: series[j].t + step, // end-exclusive
          total,
        });
      }
    }

    // sort desc by total
    windows.sort((a, b) => b.total - a.total);

    // pick top 4–6 non-overlapping windows
    const maxBars = 5;
    const chosen: Window[] = [];
    for (const w of windows) {
      const overlaps = chosen.some(
        (c) => !(w.endIdx < c.startIdx || w.startIdx > c.endIdx)
      );
      if (!overlaps) {
        chosen.push(w);
        if (chosen.length >= maxBars) break;
      }
    }

    const peaks = chosen.map((w) => ({
      start: new Date(w.start).toISOString(),
      end: new Date(w.end).toISOString(),
      total: w.total,
    }));

    return NextResponse.json({
      ok: true,
      series: cumSeries, // [{ t, energy, cum }]
      peaks,             // [{ start, end, total }]
      meta: {
        resolutionSec,
        windowMin,
        points: cumSeries.length,
        eventStart: start.toISOString(),
        eventEnd: end.toISOString(),
      },
      version: 'energy-v1',
    });
  } catch (e: any) {
    console.error('energy route error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}
