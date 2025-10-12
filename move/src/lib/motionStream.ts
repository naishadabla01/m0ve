// src/lib/motionStream.ts
import { apiBase } from "@/lib/apiBase";
import { supabase } from "@/lib/supabase";
import { Accelerometer } from "expo-sensors";
import { Platform } from "react-native";

export type StreamHandle = { stop: () => void };

type Sample = {
  t: number;            // ms since epoch
  mag: number;          // sqrt(x^2 + y^2 + z^2)
  x: number;
  y: number;
  z: number;
};

export function startMotionStream(eventId: string, postEveryMs = 1000): StreamHandle {
  // Web: no native sensor / just skip streaming
  if (Platform.OS === "web") {
    console.log("[motion] web preview only — no streaming");
    return { stop: () => {} };
  }

  let accelSub: { remove?: () => void } | null = null;
  let timer: any = null;
  let alive = true;

  const samples: Sample[] = [];
  const base = apiBase();
  const url = new URL("/api/motion", base).toString(); // <- change path if your API differs

  // Update sensor at ~25 Hz so we have enough data; we batch-send by postEveryMs.
  Accelerometer.setUpdateInterval(40);

  // Collect samples
  accelSub = Accelerometer.addListener(({ x = 0, y = 0, z = 0 }) => {
    if (!alive) return;
    const mag = Math.sqrt(x * x + y * y + z * z);
    samples.push({ t: Date.now(), mag, x, y, z });
  });

  // Periodic POST
  const tick = async () => {
    if (!alive) return;

    // nothing to send
    if (samples.length === 0) {
      timer = setTimeout(tick, postEveryMs);
      return;
    }

    // snapshot + clear
    const batch = samples.splice(0, samples.length);

    try {
      // auth/user
      const [{ data: sessionData }, { data: userData }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
      ]);
      const jwt = sessionData?.session?.access_token;
      const userId = userData?.user?.id;
      if (!userId) throw new Error("missing user id");

      const payload = {
        event_id: eventId,
        user_id: userId,
        device: Platform.OS,
        samples: batch,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.log("[motion] post non-OK", res.status, text);
      }
    } catch (e: any) {
      console.log("[motion] send failed:", e?.message || e);
    } finally {
      timer = setTimeout(tick, postEveryMs);
    }
  };

  // kick off
  console.log("[motion] streaming to", url);
  timer = setTimeout(tick, postEveryMs);

  const stop = () => {
    alive = false;
    try { accelSub?.remove?.(); } catch {}
    accelSub = null;
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return { stop };
}
