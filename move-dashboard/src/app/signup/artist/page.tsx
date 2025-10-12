"use client";

import { useState } from "react";
import Link from "next/link";

export default function ArtistSignupPage() {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (pass !== pass2) {
      setErr("Passwords do not match");
      return;
    }
    if (!/^\+?\d[\d\s\-]{6,}$/.test(phone)) {
      setErr("Please enter a valid phone number");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup-artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: first,
          last_name: last,
          email,
          password: pass,
          phone,
        }),
      });

      const json = await res.json().catch(() => ({}));
      console.log("[signup-artist] status:", res.status, "body:", json);

      if (!res.ok || !json.ok) {
        throw new Error(json?.error || `Sign up failed (${res.status})`);
      }

      setOk("Account created. You can now sign in.");
      setFirst(""); setLast(""); setEmail(""); setPass(""); setPass2(""); setPhone("");
    } catch (e: any) {
      setErr(e?.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-3xl font-semibold">Artist sign up</h1>
        <p className="mt-2 text-zinc-400">Create your artist account to manage events.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
              placeholder="First name" value={first} onChange={(e)=>setFirst(e.target.value)} required />
            <input className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
              placeholder="Last name" value={last} onChange={(e)=>setLast(e.target.value)} required />
          </div>

          <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
            type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required />

          <div className="grid gap-4 sm:grid-cols-2">
            <input className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
              type="password" placeholder="Password" value={pass} onChange={(e)=>setPass(e.target.value)} required />
            <input className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
              type="password" placeholder="Re-enter password" value={pass2} onChange={(e)=>setPass2(e.target.value)} required />
          </div>

          <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
            placeholder="Phone (required for artists)" value={phone} onChange={(e)=>setPhone(e.target.value)} required />

          {err && <div className="rounded-lg border border-red-700 bg-red-900/30 p-2 text-red-300">{err}</div>}
          {ok &&  <div className="rounded-lg border border-green-700 bg-green-900/30 p-2 text-green-300">{ok}</div>}

          <button
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2 font-medium text-black hover:bg-green-400 disabled:opacity-60"
          >
            {busy ? "Working…" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login/artist" className="text-green-400 underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
