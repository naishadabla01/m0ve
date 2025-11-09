// PATH: move-dashboard/src/app/leaderboard/LeaderboardClient.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type RowBase = {
  user_id: string;
  name?: string | null;
  last_seen?: string | null;
  seconds?: number;   // live API
  score?: number;     // final API
};

type StatusResp = {
  ok: boolean;
  isLive: boolean;      // true if not ended (status!=='ended' && !ended_at && not past end_at)
  status?: string | null;
  ended_at?: string | null;
};

const LIVE_WINDOW_MS = 20_000;

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 5_000) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      LIVE
    </span>
  );
}

export default function LeaderboardClient() {
  const params = useSearchParams();
  const eventId = params.get("event_id") ?? "";

  const [rows, setRows] = useState<RowBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [realtime, setRealtime] = useState(true);
  const [isLive, setIsLive] = useState<boolean>(true);

  // ---- helpers --------------------------------------------------------------

  const effectiveScore = (r: RowBase) =>
    typeof r.score === "number"
      ? r.score
      : typeof r.seconds === "number"
      ? r.seconds
      : 0;

  const avg = useMemo(() => {
    if (!rows.length) return 0;
    const sum = rows.reduce((a, r) => a + effectiveScore(r), 0);
    return +(sum / rows.length).toFixed(2);
  }, [rows]);

  const renderTimeCell = (row: RowBase) => {
    // For final leaderboards we don’t show LIVE badges
    if (!isLive) return <span className="text-zinc-500">—</span>;
    if (!row.last_seen) return <span className="text-zinc-500">—</span>;
    const age = Date.now() - new Date(row.last_seen).getTime();
    const live = age <= LIVE_WINDOW_MS;
    return live ? <LiveBadge /> : <span className="text-zinc-300">{timeAgo(row.last_seen)}</span>;
  };

  // ---- fetchers -------------------------------------------------------------

  const fetchStatus = useCallback(async (): Promise<boolean> => {
    if (!eventId) return false;
    try {
      const r = await fetch(`/api/events/status?event_id=${encodeURIComponent(eventId)}`, {
        cache: "no-store",
      });
      const j: StatusResp = await r.json();
      const live = !!j?.ok && !!j?.isLive;
      setIsLive(live);
      // If ended -> force realtime off
      if (!live) setRealtime(false);
      return live;
    } catch {
      // conservative default: treat as live so the page still works
      setIsLive(true);
      return true;
    }
  }, [eventId]);

  const fetchScores = async () => {
  if (!eventId) return;
  setLoading(true);
  try {
    const r = await fetch(`/api/scores?event_id=${encodeURIComponent(eventId)}`, {
      cache: 'no-store',
    });
    const j = await r.json();
    if (j?.ok && Array.isArray(j.rows)) {
      setRows(j.rows);
    }
  } finally {
    setLoading(false);
  }
};

  // ---- effects --------------------------------------------------------------

  // Initial load
  useEffect(() => {
  if (!realtime || !eventId) return;
  const id = setInterval(fetchScores, 3000);
  return () => clearInterval(id);
}, [realtime, eventId]);

  // Polling for live events only
  useEffect(() => {
    if (!realtime || !isLive || !eventId) return;
    const id = setInterval(fetchScores, 3000);
    return () => clearInterval(id);
  }, [realtime, isLive, eventId, fetchScores]);

  // ---- UI -------------------------------------------------------------------

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-3xl font-semibold text-white">Leaderboard</h1>
        <span className="text-sm rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 px-2 py-0.5">
          Avg: {avg.toFixed(2)}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => fetchScores()}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-2 text-sm ring-1 ring-zinc-700"
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={realtime && isLive}
              disabled={!isLive}
              onChange={(e) => setRealtime(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Realtime
          </label>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-800">
          <thead className="bg-zinc-900/70">
            <tr className="text-left text-zinc-300 text-sm">
              <th className="px-4 py-3 w-12">#</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">{isLive ? "Time" : "Status"}</th>
              <th className="px-4 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 bg-black/30">
            {rows.map((r, idx) => (
              <tr key={`${r.user_id}-${idx}`} className="text-sm">
                <td className="px-4 py-3 text-zinc-400">{idx + 1}</td>
                <td className="px-4 py-3 text-zinc-100">
                  {r.name?.trim() || `${r.user_id.slice(0, 6)}…${r.user_id.slice(-4)}`}
                </td>
                <td className="px-4 py-3">{renderTimeCell(r)}</td>
                <td className="px-4 py-3 text-right text-zinc-200">
                  {effectiveScore(r).toFixed(2)}
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                  No participants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
