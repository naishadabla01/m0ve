// app/e/[code]/page.tsx (Next.js App Router)
"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function EventShortLink() {
  const { code } = useParams<{ code: string }>();
  const qs = useSearchParams();
  const upper = String(code || "").toUpperCase();

  useEffect(() => {
    // Try to open the app deep link first
    // (works when your app is installed and has the "move" scheme)
    const deep = `move://scan?code=${upper}`;

    // After a short delay, fall back to the web leaderboard
    const web = `/leaderboard?code=${upper}`;

    // Attempt immediate deep-link
    const t = setTimeout(() => {
      window.location.href = web;
    }, 1200);

    try {
      // Some browsers block instant redirects if not user initiated;
      // this still works on mobile in most cases.
      window.location.href = deep;
    } catch {
      // ignore; fallback will trigger
    }

    return () => clearTimeout(t);
  }, [upper, qs]);

  // Visible fallback UI (if the redirect doesn't happen)
  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#000",color:"#fff",padding:24}}>
      <div style={{maxWidth:560}}>
        <h1 style={{fontSize:28,marginBottom:12}}>Opening Move…</h1>
        <p style={{opacity:.8,marginBottom:16}}>
          If the app doesn’t open automatically, tap one of the options below.
        </p>

        <div style={{display:"grid",gap:12}}>
          <a
            href={`move://scan?code=${upper}`}
            style={{background:"#fff",color:"#000",padding:"12px 16px",borderRadius:8,textAlign:"center",textDecoration:"none"}}
          >
            Open in the Move app
          </a>
          <a
            href={`/leaderboard?code=${upper}`}
            style={{background:"#1f2937",color:"#fff",padding:"12px 16px",borderRadius:8,textAlign:"center",textDecoration:"none",border:"1px solid #374151"}}
          >
            View leaderboard (web)
          </a>
        </div>

        <p style={{opacity:.6,marginTop:16,fontSize:12}}>
          Code: <code>{upper}</code>
        </p>
      </div>
    </main>
  );
}
