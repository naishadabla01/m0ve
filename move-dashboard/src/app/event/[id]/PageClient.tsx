'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from 'src/lib/supabase';
import { QRCodeCanvas } from 'qrcode.react';

type ScoreRow = {
  event_id: string;
  user_id: string;
  score: number;
  last_update: string | null;
};

type EventRow = {
  id: string;
  title: string | null;
  start_at: string | null;
  short_code: string | null;
};

export default function EventPage() {
  const route = useParams();
  const eventId = useMemo(() => {
    if (typeof route?.id === 'string') return route.id;
    if (Array.isArray(route?.id)) return route.id[0];
    return '';
  }, [route]);

  const [info, setInfo] = useState<EventRow | null>(null);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingScores, setLoadingScores] = useState(true);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [errorScores, setErrorScores] = useState<string | null>(null);
  const [showEventId, setShowEventId] = useState(false); // 👈 collapse state
  const [copied, setCopied] = useState(false);

  const normalize = (list: ScoreRow[]) => [...list].sort((a, b) => b.score - a.score);

  // Load event details (with short_code)
  useEffect(() => {
    let cancelled = false;
    if (!eventId) return;
    (async () => {
      try {
        setLoadingInfo(true);
        setErrorInfo(null);
        const { data, error } = await supabase
          .from('events')
          .select('id,title,start_at,short_code')
          .eq('id', eventId)
          .single();
        if (error) throw error;
        if (!cancelled) setInfo((data ?? null) as EventRow | null);
      } catch (e: any) {
        if (!cancelled) setErrorInfo(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  // Load initial scores
  useEffect(() => {
    let cancelled = false;
    if (!eventId) return;
    (async () => {
      try {
        setLoadingScores(true);
        setErrorScores(null);
        const { data, error } = await supabase
          .from('scores')
          .select('*')
          .eq('event_id', eventId)
          .order('score', { ascending: false });
        if (error) throw error;
        if (!cancelled) setRows(normalize((data ?? []) as ScoreRow[]));
      } catch (e: any) {
        if (!cancelled) setErrorScores(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoadingScores(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  // Realtime updates
  useEffect(() => {
    if (!eventId) return;
    const chan = supabase
      .channel('scores-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `event_id=eq.${eventId}` },
        (payload: any) => {
          setRows((prev) => {
            const list = [...prev];
            const next = payload?.new as ScoreRow | undefined;
            const old = payload?.old as ScoreRow | undefined;
            if (payload?.eventType === 'DELETE' && old) {
              const i = list.findIndex((r) => r.user_id === old.user_id);
              if (i >= 0) list.splice(i, 1);
              return normalize(list);
            }
            if (next) {
              const i = list.findIndex((r) => r.user_id === next.user_id);
              if (i >= 0) list[i] = next;
              else list.push(next);
            }
            return normalize(list);
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [eventId]);

  const title = info?.title || 'Event';
  const when = info?.start_at ? new Date(info.start_at) : null;
  const whenText = when
    ? when.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  const code = info?.short_code || '';
  const deepLink = code ? `move://event/${code}` : `move://event/${eventId}`;

  async function copyId() {
    try {
      await navigator.clipboard.writeText(eventId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0f1a] text-slate-200 pb-24">
      {/* header */}
      <section className="mx-auto max-w-6xl px-6 pt-10">
        <div className="rounded-2xl bg-gradient-to-br from-[#0f1321] to-[#151b2d] ring-1 ring-white/5 shadow-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 text-xs md:text-sm text-indigo-300 bg-indigo-500/10 ring-1 ring-indigo-400/30 px-2 py-0.5 rounded-full">
                Live
              </span>
              <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-white">
                {loadingInfo ? 'Loading…' : title}
              </h1>
              <p className="mt-1 text-slate-400">
                {loadingInfo ? '' : whenText}
              </p>

              {/* Short code is visible */}
              <p className="mt-1 text-slate-400">
                code:{' '}
                <span className="text-slate-50 font-semibold tracking-widest">
                  {code || '—'}
                </span>
              </p>

              {/* Event ID is collapsed by default */}
              <div className="mt-2">
                <button
                  onClick={() => setShowEventId((v) => !v)}
                  className="text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5"
                >
                  {showEventId ? 'Hide event ID' : 'Show event ID'}
                </button>

                {showEventId && (
                  <div className="mt-2 rounded-lg bg-black/30 border border-white/10 p-3">
                    <div className="flex items-start gap-3">
                      <code className="text-slate-200 break-all text-sm">{eventId}</code>
                      <button
                        onClick={copyId}
                        className="ml-auto text-xs rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 px-2 py-1"
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {errorInfo ? (
                <p className="mt-2 text-rose-300">Error: {errorInfo}</p>
              ) : null}
            </div>

            {/* QR block */}
            <div className="shrink-0 rounded-xl border border-white/10 bg-black/20 p-4 flex items-center gap-4">
              <div className="bg-white p-2 rounded-lg">
                <QRCodeCanvas value={code || eventId || ''} size={140} includeMargin />
              </div>
              <div className="text-xs md:text-sm w-56">
                <p className="text-slate-300 font-semibold">Check-in QR</p>
                <p className="text-slate-400 mt-1">
                  Fans scan this with the Move app to join this event.
                </p>
                <div className="mt-2">
                  <p className="text-slate-400">Deep link:</p>
                  <code className="text-slate-200 break-all">{deepLink}</code>
                </div>
              </div>
            </div>

            <Link
              href="/"
              className="md:self-start shrink-0 rounded-xl px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10"
            >
              ← Back
            </Link>
          </div>
        </div>
      </section>

      {/* table */}
      <section className="mx-auto max-w-6xl px-6 mt-6">
        <div className="rounded-2xl overflow-hidden ring-1 ring-white/5 bg-[#0f1321]">
          <div className="grid grid-cols-12 px-6 py-4 text-xs md:text-sm text-slate-400 border-b border-white/5">
            <div className="col-span-1">#</div>
            <div className="col-span-6 md:col-span-6">User</div>
            <div className="col-span-3 md:col-span-3">Score</div>
            <div className="col-span-2 md:col-span-2 text-right">Updated</div>
          </div>

          {loadingScores ? (
            <div className="p-6 text-slate-400">Loading…</div>
          ) : errorScores ? (
            <div className="p-6 text-rose-300">Error: {errorScores}</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-slate-400">No scores yet.</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {rows.map((r, i) => {
                const t = r.last_update ? new Date(r.last_update) : null;
                const ts = t ? t.toLocaleTimeString() : '—';
                return (
                  <li
                    key={r.user_id}
                    className="grid grid-cols-12 items-center px-6 py-4 hover:bg-white/2"
                  >
                    <div className="col-span-1">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                        {i + 1}
                      </span>
                    </div>
                    <div className="col-span-6 md:col-span-6 truncate text-slate-200">
                      {r.user_id.slice(0, 10)}…
                    </div>
                    <div className="col-span-3 md:col-span-3 font-semibold text-white">
                      {r.score.toFixed(3)}
                    </div>
                    <div className="col-span-2 md:col-span-2 text-right text-slate-400">
                      {ts}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
