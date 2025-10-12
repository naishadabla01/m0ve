'use client';

import { useEffect, useMemo, useState } from 'react';
import ShareJoinModal from '@/components/ShareJoinModal';
import { createClient } from '@supabase/supabase-js';

type EventRow = {
  event_id: string;
  name: string | null;
  title?: string | null;
  short_code: string | null;
  start_at: string | null;
  end_at: string | null;
  artist_id: string;
};

export default function ArtistHome() {
  // ---------- state ----------
  const [events, setEvents] = useState<EventRow[]>([]);
  const [liveEvents, setLiveEvents] = useState<EventRow[]>([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // QR modals
  const [appQrOpen, setAppQrOpen] = useState(false);
  const [qrEvt, setQrEvt] = useState<{ event_id: string; code?: string | null } | null>(null);

  // ---------- supabase browser client ----------
  const sb = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  async function getAuthHeader() {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) throw new Error('Not signed in');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    } as const;
  }

  // ---------- load events ----------
  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const headers = await getAuthHeader();

      const r1 = await fetch('/api/events/list?scope=mine', {
        headers,
        cache: 'no-store',
      });
      const j1 = await r1.json();
      if (!j1?.ok) throw new Error(j1?.error || 'Failed to load events');
      setEvents(j1.events ?? []);

      const r2 = await fetch('/api/events/list?scope=ongoing', {
        headers,
        cache: 'no-store',
      });
      const j2 = await r2.json();
      if (!j2?.ok) throw new Error(j2?.error || 'Failed to load ongoing');
      setLiveEvents(j2.events ?? []);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // ---------- create event ----------
  async function createEvent() {
    if (!name.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: name.trim(),
          start_at: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Failed to create event');
      setName('');
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || String(e));
      alert(e?.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  }

  // ---------- end event ----------
  async function endEvent(event_id: string) {
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/events/end', {
        method: 'POST',
        headers,
        body: JSON.stringify({ event_id }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Failed to end event');
      await load();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Could not end event');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayTitle = (ev: EventRow) =>
    (ev.name ?? ev.title ?? '').toString() || '—';

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold">Artist Dashboard</h1>
          {/* (App QR button moved to Quick actions) */}
        </div>

        {/* Create + Quick actions */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Create */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="mb-2 text-xl font-semibold">Create event</h2>
            <div className="flex gap-3">
              <input
                className="flex-1 rounded-lg bg-zinc-900/60 px-3 py-2 outline-none border border-zinc-800"
                placeholder="New event name…"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                onClick={createEvent}
                disabled={creating}
                className="rounded-lg bg-white px-4 py-2 text-black hover:bg-zinc-200 disabled:opacity-60"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </section>

          {/* Quick actions with App QR */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="mb-2 text-xl font-semibold">Quick actions</h2>
            <div className="flex items-center">
              <button
                onClick={() => setAppQrOpen(true)}
                className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-zinc-200 hover:bg-zinc-800"
              >
                App QR
              </button>
            </div>
          </section>
        </div>

        {err && (
          <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-red-200">
            {err}
          </div>
        )}

        {/* Tables */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* My events */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
              <h2 className="text-xl font-semibold">My events</h2>
              <button
                onClick={load}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm hover:bg-zinc-800"
              >
                Refresh
              </button>
            </div>

            <table className="min-w-full">
              <thead className="bg-zinc-900/60 text-zinc-300">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Event</th>
                  <th className="px-4 py-3 text-left font-medium">Code</th>
                  <th className="px-4 py-3 text-left font-medium">Start</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && events.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                      No events yet.
                    </td>
                  </tr>
                )}
                {events.map((ev) => {
                  const finished = !!ev.end_at;
                  return (
                    <tr key={ev.event_id} className="hover:bg-zinc-900/30">
                      <td className="px-4 py-3">
                        <div className="whitespace-pre-line">{displayTitle(ev)}</div>
                      </td>
                      <td className="px-4 py-3 font-mono">{ev.short_code ?? '—'}</td>
                      <td className="px-4 py-3">
                        {ev.start_at ? new Date(ev.start_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setQrEvt({ event_id: ev.event_id, code: ev.short_code })}
                            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm hover:bg-zinc-800"
                          >
                            Event QR
                          </button>

                          <a
                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm hover:bg-emerald-500"
                            href={`/leaderboard?event_id=${ev.event_id}`}
                          >
                            Open Leaderboard
                          </a>

                          {finished ? (
                            <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                              Finished
                            </span>
                          ) : (
                            <button
                              onClick={() => endEvent(ev.event_id)}
                              className="rounded-md bg-amber-600 px-3 py-1.5 text-sm hover:bg-amber-500"
                            >
                              End Event
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Ongoing events */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
              <h2 className="text-xl font-semibold">Ongoing events</h2>
              <button
                onClick={load}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm hover:bg-zinc-800"
              >
                Refresh
              </button>
            </div>

            <table className="min-w-full">
              <thead className="bg-zinc-900/60 text-zinc-300">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Event</th>
                  <th className="px-4 py-3 text-left font-medium">Code</th>
                  <th className="px-4 py-3 text-left font-medium">Started</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && liveEvents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                      No live events.
                    </td>
                  </tr>
                )}
                {liveEvents.map((ev) => (
                  <tr key={ev.event_id} className="hover:bg-zinc-900/30">
                    <td className="px-4 py-3">{displayTitle(ev)}</td>
                    <td className="px-4 py-3 font-mono">{ev.short_code ?? '—'}</td>
                    <td className="px-4 py-3">
                      {ev.start_at ? new Date(ev.start_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-700/80 px-2 py-0.5 text-[10px] leading-4">
                          Live
                        </span>

                        <button
                          onClick={() => setQrEvt({ event_id: ev.event_id, code: ev.short_code })}
                          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm hover:bg-zinc-800"
                        >
                          Event QR
                        </button>

                        <a
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm hover:bg-emerald-500"
                          href={`/leaderboard?event_id=${ev.event_id}`}
                        >
                          Open Leaderboard
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>

      {/* Modals */}
      <ShareJoinModal open={appQrOpen} onClose={() => setAppQrOpen(false)} />
      <ShareJoinModal
        open={!!qrEvt}
        onClose={() => setQrEvt(null)}
        eventId={qrEvt?.event_id}
        shortCode={qrEvt?.code ?? undefined}
        showCode
      />
    </main>
  );
}
