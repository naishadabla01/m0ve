'use client';
import { QRCodeCanvas } from 'qrcode.react';

type Props = {
  open: boolean;
  onClose: () => void;
  eventId?: string;
  shortCode?: string;
  showCode?: boolean;
};

export default function ShareJoinModal({
  open,
  onClose,
  eventId,
  shortCode,
  showCode,
}: Props) {
  if (!open) return null;

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const query = eventId ? `event_id=${eventId}` : shortCode ? `code=${shortCode}` : '';
  const appLink = `move://join${query ? `?${query}` : ''}`;
  const webJoin = `${origin}/join${query ? `?${query}` : ''}`;
  const leaderboard = `${origin}/leaderboard${query ? `?${query}` : ''}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Share / Join</h3>
          <button
            onClick={onClose}
            className="rounded bg-white px-3 py-1.5 text-sm text-black hover:bg-zinc-200"
          >
            Close
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* App deep link */}
          <section className="rounded-xl border border-zinc-800 p-4">
            <h4 className="mb-3 text-sm text-zinc-300">Open in app</h4>
            <div className="mx-auto w-fit rounded-lg bg-white p-3">
              <QRCodeCanvas value={appLink} size={220} />
            </div>
            {showCode && shortCode && (
              <p className="mt-3 text-center text-sm text-black">
                <span className="rounded bg-white px-2 py-0.5 font-mono">{shortCode}</span>
              </p>
            )}
            <div className="mt-3">
              <input
                value={appLink}
                readOnly
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-200"
              />
              <button
                onClick={() => navigator.clipboard?.writeText(appLink)}
                className="mt-2 w-full rounded bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
              >
                Copy app link
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Cameras that support app links will open the Move app via the{' '}
              <code className="rounded bg-zinc-900 px-1">move://</code> scheme.
            </p>
          </section>

          {/* Web fallback */}
          <section className="rounded-xl border border-zinc-800 p-4">
            <h4 className="mb-3 text-sm text-zinc-300">Web fallback</h4>
            <div className="mx-auto w-fit rounded-lg bg-white p-3">
              <QRCodeCanvas value={webJoin} size={220} />
            </div>
            <div className="mt-3">
              <input
                value={webJoin}
                readOnly
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-200"
              />
              <button
                onClick={() => navigator.clipboard?.writeText(webJoin)}
                className="mt-2 w-full rounded bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
              >
                Copy web join link
              </button>
            </div>

            <div className="mt-5">
              <h5 className="mb-2 text-sm text-zinc-300">Leaderboard</h5>
              <input
                value={leaderboard}
                readOnly
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-200"
              />
              <button
                onClick={() => navigator.clipboard?.writeText(leaderboard)}
                className="mt-2 w-full rounded bg-white px-3 py-2 text-sm text-black hover:bg-zinc-200"
              >
                Copy leaderboard link
              </button>
            </div>
          </section>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Tip: print the QR that fits your use case (app deep link for participants, web link for TVs).
        </p>
      </div>
    </div>
  );
}
