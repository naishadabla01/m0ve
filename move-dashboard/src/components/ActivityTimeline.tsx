"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// —— small helper to build an absolute base URL on the server or client
function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  const env =
    process.env.NEXT_PUBLIC_DASHBOARD_BASE ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return env.replace(/\/+$/, "");
}

type DataPoint = { label: string; ts: string; energy: number };

export default function ActivityTimeline({
  eventId,
  height = 260,           // ⬅️ smaller by default
  barSize = 10,           // compact bars
}: {
  eventId: string;
  height?: number;
  barSize?: number;
}) {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const base = getBaseUrl();
      // “entire event” buckets (use your existing API shape)
      const r = await fetch(`${base}/api/buckets?event_id=${encodeURIComponent(eventId)}&minutes=all`, {
        cache: "no-store",
      });
      const j = await r.json();
      if (!alive || !j?.ok) return;

      // Expecting something like [{ bucket_ts, sum_accel, ... }]
      const rows = (j.data || j.rows || []).map((b: any) => ({
        ts: b.timestamp || b.bucket_ts || b.ts,
        label: timeLabel(b.timestamp || b.bucket_ts || b.ts),
        energy: Number(b.sum_accel ?? b.energy ?? 0),
      }));

      // newest at bottom (ascending time)
      rows.sort((a: DataPoint, b: DataPoint) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
      setData(rows);
    })();
    return () => {
      alive = false;
    };
  }, [eventId]);

  const maxX = useMemo(
    () => Math.max(0, ...data.map((d) => d.energy)) || 1,
    [data]
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-black/30">
      <div className="flex items-center justify-between px-4 pt-3">
        <h3 className="text-sm font-medium text-zinc-200">Crowd Energy (entire event)</h3>
        <span className="text-xs text-zinc-500">X: energy, Y: time (newest at bottom)</span>
      </div>

      <div className="h-px w-full bg-zinc-800/80 mt-2" />

      <div className="px-2 py-3">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 0, left: 56 }}
            barSize={barSize}
            barCategoryGap={8}
          >
            {/* Subtle grid for dark mode */}
            <CartesianGrid horizontal={true} vertical={false} stroke="rgba(255,255,255,0.06)" />

            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: "#A1A1AA", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.15)" }}
              width={56}
            />

            <XAxis
              type="number"
              domain={[0, Math.ceil(maxX * 1.05)]}
              tick={{ fill: "#A1A1AA", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.15)" }}
              label={{
                value: "Crowd Energy",
                position: "insideRight",
                offset: -8,
                fill: "#9CA3AF",
                fontSize: 12,
              }}
            />

            <Tooltip
              cursor={{ fill: "rgba(34,197,94,0.10)" }}
              contentStyle={{
                backgroundColor: "#0a0a0a",
                border: "1px solid #27272a",
                borderRadius: 8,
                color: "#e4e4e7",
                padding: "8px 10px",
              }}
              formatter={(value: number) => [value.toFixed(2), "Energy"]}
              labelFormatter={(l) => `Bucket: ${l}`}
            />

            {/* Clean green gradient bar in dark mode */}
            <defs>
              <linearGradient id="energyGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={1} />
              </linearGradient>
            </defs>

            <Bar
              dataKey="energy"
              fill="url(#energyGrad)"
              radius={[6, 6, 6, 6]}
              stroke="#14532d"
              strokeOpacity={0.35}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ——— helpers
function timeLabel(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase();
}
