'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';

// 1) Safe QR (prevents any SSR hiccups)
const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });

// 2) Consistent origin across dev/prod
function getOrigin() {
  if (process.env.NEXT_PUBLIC_WEB_ORIGIN) return process.env.NEXT_PUBLIC_WEB_ORIGIN.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return ''; // should never hit because we're client-side
}

export default function JoinPage() {
  const params = useSearchParams();
  const eventId = params.get('event_id') ?? '';
  const code = params.get('code') ?? '';

  const appLink = useMemo(() => {
    const qs = new URLSearchParams();
    if (eventId) qs.set('event_id', eventId);
    if (!eventId && code) qs.set('code', code);
    return `move://join?${qs.toString()}`;
  }, [eventId, code]);

  const webJoinLink = useMemo(() => {
    const qs = new URLSearchParams();
    if (eventId) qs.set('event_id', eventId);
    if (!eventId && code) qs.set('code', code);
    return `${getOrigin()}/join?${qs.toString()}`;
  }, [eventId, code]);

  const leaderboardLink = useMemo(() => {
    const qs = new URLSearchParams();
    if (eventId) qs.set('event_id', eventId);
    return `${getOrigin()}/leaderboard?${qs.toString()}`;
  }, [eventId]);

  if (!eventId && !code) {
    return (
      <main className="min-h-screen bg-black text-white grid place-items-center p-6">
        <div className="max-w-xl w-full space-y-3 text-center">
          <h1 className="text-2xl font-semibold">Join</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl p-6 space-y-8">
        <h1 className="text-3xl font-semibold">Join Event</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Open in app */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="mb-3 text-xl font-semibold">Open in app</h2>
            <div className="flex items-center justify-center p-4 bg-white rounded-xl">
              <QRCode value={appLink} size={208} />
            </div>
            <div className="mt-3 font-mono break-all text-sm text-zinc-300">{appLink}</div>
            <a href={appLink} className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-black hover:bg-zinc-200">
              Open app link
            </a>
          </section>

          {/* Web fallback */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="mb-3 text-xl font-semibold">Web fallback</h2>
            <div className="flex items-center justify-center p-4 bg-white rounded-xl">
              <QRCode value={webJoinLink} size={208} />
            </div>
            <div className="mt-3 font-mono break-all text-sm text-zinc-300">{webJoinLink}</div>
            <a
              href={webJoinLink}
              className="mt-3 inline-block rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 hover:bg-zinc-800"
            >
              Copy or open web join link
            </a>

            <div className="mt-6 border-t border-zinc-800 pt-4">
              <h3 className="mb-2 text-lg font-medium">Leaderboard</h3>
              <div className="font-mono break-all text-sm text-zinc-300">{leaderboardLink}</div>
              <a
                href={leaderboardLink}
                className="mt-2 inline-block rounded-lg bg-emerald-600 px-4 py-2 hover:bg-emerald-500"
              >
                Open leaderboard
              </a>
            </div>
          </section>
        </div>

        {(code || eventId) && (
          <p className="text-sm text-zinc-400">
            Event: {eventId ? <code>{eventId}</code> : <span>—</span>} &nbsp; Code:{' '}
            {code ? <code>{code}</code> : <span>—</span>}
          </p>
        )}
      </div>
    </main>
  );
}
