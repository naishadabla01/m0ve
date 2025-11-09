// PATH: move-dashboard/src/app/artist/home/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import ShareJoinModal from '@/components/ShareJoinModal';
import { createClient } from '@supabase/supabase-js';
import { Plus_Jakarta_Sans } from 'next/font/google';
const artistFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: '700' });

// ---------- Supabase browser client (single instance) ----------
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

type EventRow = {
  event_id: string;
  name: string | null;
  title?: string | null;
  short_code?: string | null;
  code?: string | null;
  start_at: string | null;
  end_at: string | null;
  ended_at?: string | null;
  status?: string | null;
  artist_id: string;
};

export default function ArtistHome() {
  // ---------- state ----------
  const [events, setEvents] = useState<EventRow[]>([]);
  const [liveEvents, setLiveEvents] = useState<EventRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // QR modals
  const [appQrOpen, setAppQrOpen] = useState(false);
  const [qrEvt, setQrEvt] = useState<{ event_id: string; code?: string | null } | null>(null);

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
    if (!form.title.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      const headers = await getAuthHeader();

      // Build ISO timestamps from your form fields
      const startISO =
        form.date && form.startTime
          ? new Date(`${form.date}T${form.startTime}:00`).toISOString()
          : new Date().toISOString();

      const endISO =
        form.date && form.endTime ? new Date(`${form.date}T${form.endTime}:00`).toISOString() : null;

      // Upload cover (optional)
      let cover_url: string | null = null;
      if (coverFile) {
        const fileName = `${crypto.randomUUID()}-${coverFile.name}`;
        const up = await sb.storage.from('event-covers').upload(`covers/${fileName}`, coverFile, {
          upsert: false,
        });
        if (up.error) throw new Error(`Cover upload failed: ${up.error.message}`);
        const pub = sb.storage.from('event-covers').getPublicUrl(`covers/${fileName}`);
        cover_url = pub.data?.publicUrl ?? null;
      }

      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: form.title.trim(),
          start_at: startISO,
          end_at: endISO,
          location: form.location || null,
          cover_url,
        }),
      });

      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Failed to create event');

      // success: reset + close
      setForm({ title: '', date: '', startTime: '', endTime: '', location: '' });
      setCoverFile(null);
      setShowCreate(false);
      await load();
    } catch (e: any) {
      console.error('Create event error:', e);
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
      console.error('End event error:', e);
      alert(e?.message || 'Failed to end event');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayTitle = (ev: EventRow) => (ev.name ?? ev.title ?? '').toString() || '—';
  const displayCode = (ev: EventRow) => ev.short_code ?? ev.code ?? '—';

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold">Artist Dashboard</h1>
        </div>

        {/* Create + Quick actions */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Create */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="mb-2 text-xl font-semibold">Create event</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-lg bg-white px-4 py-2 text-black hover:bg-zinc-200"
              >
                + Create Event
              </button>
            </div>

            {/* Modal */}
            {showCreate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/70" onClick={() => setShowCreate(false)} />
                <div className="relative z-10 w-full max-w-xl rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div className={artistFont.className + ' text-xl md:text-2xl'}>
                      Create Your Event
                    </div>
                    <button
                      onClick={() => setShowCreate(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-1">Event Name</label>
                      <input
                        className="w-full rounded-lg bg-zinc-900/60 px-3 py-2 outline-none border border-zinc-800"
                        placeholder="Your Concert Name"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                      />
                    </div>

                    {/* date + times */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-1">Event Date</label>
                        <input
                          type="date"
                          className="w-full rounded-lg bg-zinc-900/60 px-3 py-2 outline-none border border-zinc-800"
                          value={form.date}
                          onChange={(e) => setForm({ ...form, date: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold mb-1">Start Time</label>
                          <input
                            type="time"
                            className="w-full rounded-lg bg-zinc-900/60 px-3 py-2 outline-none border border-zinc-800"
                            value={form.startTime}
                            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-1">End Time</label>
                          <input
                            type="time"
                            className="w-full rounded-lg bg-zinc-900/60 px-3 py-2 outline-none border border-zinc-800"
                            value={form.endTime}
                            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-1">Event Location</label>
                      <input
                        className="w-full rounded-lg bg-zinc-900/60 px-3 py-2 outline-none border border-zinc-800"
                        placeholder="e.g., The Roxy Theatre, Los Angeles"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">Cover Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-white hover:file:bg-zinc-700"
                      />
                      {coverFile && (
                        <p className="mt-1 text-xs text-zinc-400">Selected: {coverFile.name}</p>
                      )}
                      <p className="mt-2 text-[10px] font-semibold text-zinc-400">
                        Recommended Cover Size (≈ 1200×630)
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setShowCreate(false)}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={createEvent}
                        disabled={creating || !form.title}
                        className="rounded-lg bg-white px-4 py-2 text-black hover:bg-zinc-200 disabled:opacity-60"
                      >
                        {creating ? 'Creating…' : 'Create Event'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                  const now = Date.now();
const endTs = ev.end_at ? new Date(ev.end_at).getTime() : null;
const finished =
  ev.status === 'ended' || !!ev.ended_at || (endTs ? now >= endTs : false);
                  return (
                    <tr key={ev.event_id} className="hover:bg-zinc-900/30">
                      <td className="px-4 py-3">
                        <div className="whitespace-pre-line">{displayTitle(ev)}</div>
                      </td>
                      <td className="px-4 py-3 font-mono">{displayCode(ev)}</td>
                      <td className="px-4 py-3">
                        {ev.start_at ? new Date(ev.start_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() =>
                              setQrEvt({
                                event_id: ev.event_id,
                                code: displayCode(ev),
                              })
                            }
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
                    <td className="px-4 py-3 font-mono">{displayCode(ev)}</td>
                    <td className="px-4 py-3">
                      {ev.start_at ? new Date(ev.start_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-700/80 px-2 py-0.5 text-[10px] leading-4">
                          Live
                        </span>

                        <button
                          onClick={() =>
                            setQrEvt({ event_id: ev.event_id, code: displayCode(ev) })
                          }
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
