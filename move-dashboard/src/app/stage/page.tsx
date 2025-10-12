// app/stage/page.tsx
"use client";
import { useEffect } from "react";

export default function Stage() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const token = params.get("token") || "";

  useEffect(() => {
    // simplest: redirect to LiveKit Meet hosted UI using the token
    if (token) {
      window.location.href = `https://meet.livekit.io/?token=${encodeURIComponent(token)}`;
    }
  }, [token]);

  return <main className="p-6">Opening stage…</main>;
}
