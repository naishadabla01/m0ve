"use client";

import { useEffect, useMemo, useState } from "react";

/** Server payload shape */
type ActivityBin = { t: number; energy: number };
type Peak = { label: string; energy: number };

/** Simple Catmull–Rom to cubic bezier for a musical, wavy line */
function toSmoothPath(points: { x: number; y: number }[], tension = 0.5) {
  if (points.length < 2) return "";
  const seg: string[] = [];
  seg.push(`M${points[0].x},${points[0].y}`);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension;
    seg.push(`C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`);
  }
  return seg.join(" ");
}

/** format helpers */
const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** clamp */
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export default function EnergyPanel({
  eventId,
  lookbackMin = 120,       // last N minutes window
  bucketSec = 120,         // grid resolution (seconds)
}: {
  eventId: string;
  lookbackMin?: number;
  bucketSec?: number;
}) {
  const [bins, setBins] = useState<ActivityBin[]>([]);
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [loading, setLoading] = useState(false);
  const [realtime, setRealtime] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  /** Load activity from API */
  async function fetchActivity() {
    if (!eventId) return;
    setLoading(true);
    try {
      const r = await fetch(
        `/api/events/activity?event_id=${encodeURIComponent(eventId)}`,
        { cache: "no-store" }
      );
      const j = (await r.json().catch(() => null)) as
        | { bins?: ActivityBin[]; peaks?: Peak[] }
        | null;

      const parsed: ActivityBin[] = Array.isArray(j?.bins)
        ? j!.bins
            .map((d: any) => ({
              t: Number(d?.t),
              energy: Number(d?.energy),
            }))
            .filter((d) => Number.isFinite(d.t) && Number.isFinite(d.energy))
            .sort((a, b) => a.t - b.t)
        : [];

      setBins(parsed);

      setPeaks(
        Array.isArray(j?.peaks)
          ? j!.peaks
              .map((p: any) => ({
                label: String(p?.label ?? ""),
                energy: Number(p?.energy ?? 0),
              }))
              .filter((p) => p.label)
          : []
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (!realtime) return;
    const id = setInterval(fetchActivity, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtime, eventId]);

  /** Build a regular time grid (zero-filled) + path + axes */
  const {
    svg,
    pathD,
    seriesTs,
    seriesEnergy,
    yTicks,
    xTicks,
    maxEnergy,
    points,
    pointsCount,
  } = useMemo(() => {
    const width = 1000;
    const height = 300;
    const margin = { top: 20, right: 16, bottom: 36, left: 42 };

    const now = Date.now();
    const start = now - lookbackMin * 60_000;
    const step = bucketSec * 1000;

    // ---- regular grid timestamps
    const seriesTs: number[] = [];
    for (let t = start; t <= now; t += step) seriesTs.push(t);

    // map source into nearest grid slot (within half-step)
    const half = step / 2;
    const grid: number[] = new Array(seriesTs.length).fill(0);

    if (bins.length) {
      for (const b of bins) {
        // skip bins outside the window
        if (b.t < start - half || b.t > now + half) continue;
        // nearest grid index
        const idx = clamp(
          Math.round((b.t - start) / step),
          0,
          seriesTs.length - 1
        );
        grid[idx] = Number(b.energy) || 0;
      }
    }

    // y scale
    const maxE = Math.max(1, ...grid);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const toX = (i: number) =>
      margin.left + (i / (seriesTs.length - 1)) * innerW;
    const toY = (e: number) => margin.top + innerH - (e / maxE) * innerH;

    // points for path
    const pts = grid.map((e, i) => ({ x: toX(i), y: toY(e) }));
    const pathD = toSmoothPath(pts, 0.5);

    // axis ticks
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
      y: margin.top + innerH - r * innerH,
      label: Math.round(r * maxE),
    }));

    // 6 evenly spaced time ticks
    const xTicks = Array.from({ length: 6 }, (_, k) => {
      const i = Math.round((k / 5) * (seriesTs.length - 1));
      return { x: toX(i), label: fmtTime(seriesTs[i]) };
    });

    return {
      svg: { width, height, margin, W: innerW, H: innerH },
      pathD,
      seriesTs,
      seriesEnergy: grid,
      yTicks,
      xTicks,
      maxEnergy: maxE,
      points: pts,
      pointsCount: pts.length,
    };
  }, [bins, lookbackMin, bucketSec]);

  const lastTs = seriesTs.at(-1) ?? null;

  return (
    <div className="w-full">
      {/* Top row header */}
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-xl font-semibold text-white">
          Crowd Energy (Last {lookbackMin} min)
        </h2>
        <div className="text-sm text-zinc-400">
          {pointsCount} points{lastTs ? ` · last ${fmtTime(lastTs)}` : ""}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={fetchActivity}
            disabled={loading}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-1.5 text-sm ring-1 ring-zinc-700"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={realtime}
              onChange={(e) => setRealtime(e.target.checked)}
              className="h-4 w-4 accent-fuchsia-500"
            />
            Realtime
          </label>
        </div>
      </div>

      {/* Chart + Peaks */}
      <div className="grid grid-cols-12 gap-4">
        {/* chart */}
        <div className="col-span-12 lg:col-span-9 rounded-2xl border border-zinc-800 bg-black/40 p-3">
          {!pointsCount ? (
            <div className="h-[300px] flex items-center justify-center text-zinc-500">
              Not enough data yet.
            </div>
          ) : (
            <svg viewBox={`0 0 ${svg.width} ${svg.height}`} className="w-full h-[300px]">
              <defs>
                {/* stroke gradient */}
                <linearGradient id="energy-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d946ef" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
              </defs>

              {/* y grid + labels */}
              {yTicks.map((t, i) => (
                <g key={`yt-${i}`}>
                  <line
                    x1={svg.margin.left}
                    x2={svg.width - svg.margin.right}
                    y1={t.y}
                    y2={t.y}
                    stroke="rgba(255,255,255,.06)"
                  />
                  <text
                    x={svg.margin.left - 8}
                    y={t.y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#9ca3af"
                  >
                    {t.label}
                  </text>
                </g>
              ))}

              {/* x ticks + labels */}
              {xTicks.map((t, i) => (
                <g key={`xt-${i}`}>
                  <line
                    x1={t.x}
                    x2={t.x}
                    y1={svg.margin.top}
                    y2={svg.height - svg.margin.bottom}
                    stroke="rgba(255,255,255,.04)"
                  />
                  <text
                    x={t.x}
                    y={svg.height - 12}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#9ca3af"
                  >
                    {t.label}
                  </text>
                </g>
              ))}

              {/* energy line */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#energy-stroke)"
                strokeWidth={3.2}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 10px rgba(236,72,153,.35))" }}
              />

              {/* HOVER: snap by bucket with invisible rects */}
              {points.map((p, i) => {
                const next = points[i + 1] ?? p;
                const bx = Math.max(8, next.x - p.x || (p.x - (points[i - 1]?.x ?? p.x)));
                const x0 = p.x - bx / 2;
                return (
                  <rect
                    key={`hit-${i}`}
                    x={x0}
                    y={svg.margin.top}
                    width={bx}
                    height={svg.H}
                    fill="transparent"
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseMove={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                    style={{ cursor: "crosshair" }}
                  />
                );
              })}

              {hoverIdx != null && hoverIdx >= 0 && hoverIdx < seriesTs.length && (
                <>
                  {/* guide */}
                  <line
                    x1={points[hoverIdx].x}
                    x2={points[hoverIdx].x}
                    y1={svg.margin.top}
                    y2={svg.height - svg.margin.bottom}
                    stroke="rgba(255,255,255,.18)"
                    strokeDasharray="4 4"
                  />
                  {/* marker */}
                  <circle
                    cx={points[hoverIdx].x}
                    cy={points[hoverIdx].y}
                    r={4.5}
                    fill="#fff"
                    opacity={0.95}
                  />
                  {/* tooltip */}
                  <g transform={`translate(${points[hoverIdx].x + 10},${points[hoverIdx].y - 24})`}>
                    <rect
                      x={-6}
                      y={-16}
                      width="128"
                      height="36"
                      rx="6"
                      fill="rgba(17,24,39,.96)"
                      stroke="rgba(255,255,255,.15)"
                    />
                    <text x={0} y={0} fill="#e5e7eb" fontSize="11">
                      {fmtTime(seriesTs[hoverIdx])}
                    </text>
                    <text x={0} y={12} fill="#a78bfa" fontSize="12" fontWeight={600}>
                      {Math.round(seriesEnergy[hoverIdx])} energy
                    </text>
                  </g>
                </>
              )}
            </svg>
          )}
        </div>

        {/* peaks card */}
        <div className="col-span-12 lg:col-span-3 rounded-2xl border border-zinc-800 bg-black/40 p-3">
          <div className="text-sm font-semibold text-zinc-200 mb-3">Top peaks</div>
          {!peaks.length ? (
            <div className="text-sm text-zinc-500">Not enough data yet.</div>
          ) : (
            <div className="space-y-2">
              {peaks.slice(0, 6).map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="text-zinc-300 w-24">{p.label}</div>
                  <div className="flex-1 h-2 rounded bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${Math.min(100, (p.energy / (maxEnergy || 1)) * 100)}%`,
                        background: "linear-gradient(90deg, #d946ef 0%, #fb7185 100%)",
                        boxShadow: "0 0 10px rgba(236,72,153,.45)",
                      }}
                    />
                  </div>
                  <div className="w-10 text-right text-zinc-400 text-sm">
                    {Math.round(p.energy)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
