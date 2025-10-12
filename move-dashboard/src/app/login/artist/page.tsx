"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/Spinner";
import { supabase } from "@/lib/supabase-browser";

export default function ArtistLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      // soft transition
      router.replace("/artist/home");
    } catch (e: any) {
      setErr(e?.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-3xl font-semibold">Artist sign in</h1>
        <p className="mt-2 text-zinc-400">Use the account you created as an artist.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
            type="email" placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)} required
          />
          <input
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
            type="password" placeholder="Password"
            value={pass} onChange={e => setPass(e.target.value)} required
          />

          {err && <div className="rounded-lg border border-red-700 bg-red-900/30 p-2 text-red-300">{err}</div>}

          <button
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2 font-medium text-black hover:bg-green-400 disabled:opacity-60"
          >
            {busy && <Spinner />} <span>Sign in</span>
          </button>
        </form>

        <p className="mt-6 text-sm text-zinc-500">
          New?{" "}
          <Link href="/signup/artist" className="text-green-400 underline">
            Sign up here
          </Link>
        </p>
      </div>
    </main>
  );
}
