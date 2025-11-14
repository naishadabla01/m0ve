// PATH: move/src/lib/sensors/useLinearAcceleration.ts
import { DeviceMotion, type DeviceMotionMeasurement } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

/** Minimal listener type (what addListener returns) */
type Sub = { remove(): void };

/** -------- Vector helpers -------- */
type Vec3 = { x: number; y: number; z: number };
const v   = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
const add = (a: Vec3, b: Vec3): Vec3 => v(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a: Vec3, b: Vec3): Vec3 => v(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a: Vec3, s: number): Vec3 => v(a.x * s, a.y * s, a.z * s);
const mag = (a: Vec3): number => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);

/** -------- Hook options / return -------- */
export type UseLinAccOpts = {
  hz?: number;        // target frequency
  deadZone?: number;  // clamp small idle noise
  smooth?: number;    // EMA smoothing factor for magnitude (0..1)
};

export type UseLinAccReturn = {
  value: Vec3;        // gravity-removed linear acceleration (m/s^2)
  magnitude: number;  // smoothed magnitude (m/s^2)
};

export default function useLinearAcceleration(
  opts: UseLinAccOpts = {}
): UseLinAccReturn {
  const { hz = 30, deadZone = 0.015, smooth = 0.35 } = opts;

  const [vec, setVec] = useState<Vec3>(v());
  const [magEma, setMagEma] = useState(0);

  // low-pass gravity estimate for devices that only give accelIncludingGravity
  const gLP = useRef<Vec3>(v());
  const emaRef = useRef(0);

  useEffect(() => {
    DeviceMotion.setUpdateInterval(Math.max(16, Math.round(1000 / hz)));

    const listener = (data: DeviceMotionMeasurement) => {
      const a  = (data.acceleration as Vec3 | null) ?? null;
      const ag = (data.accelerationIncludingGravity as Vec3 | null) ?? null;

      let linear: Vec3;

      if (a && ag) {
        // already linear; gravity could be (ag - a) if you ever need it
        linear = a;
      } else if (ag) {
        // estimate gravity with low-pass, then linear = ag - g_est
        const alpha = 0.95; // higher = slower gravity drift
        gLP.current = add(mul(gLP.current, alpha), mul(ag, 1 - alpha));
        linear = sub(ag, gLP.current);
      } else if (a) {
        linear = a;
      } else {
        linear = v();
      }

      // dead-zone to zero out tiny idle noise
      const m = mag(linear);
      const lin = m < deadZone ? v() : linear;

      setVec(lin);

      // EMA smoothing on magnitude for display/aggregation
      const ema = emaRef.current * smooth + m * (1 - smooth);
      emaRef.current = ema;
      setMagEma(ema < deadZone ? 0 : ema);
    };

    // ✅ rename to avoid shadowing the `sub()` vector helper
    const subscription: Sub = DeviceMotion.addListener(listener) as unknown as Sub;
    return () => subscription.remove();
  }, [hz, deadZone, smooth]);

  return { value: vec, magnitude: magEma };
}
