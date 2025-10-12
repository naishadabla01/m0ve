"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Role = "artist" | "user" | "guest";

export default function Onboarding() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [role, setRole] = useState<Role>("artist");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      // pre-fill if profile exists
      const { data: prof } = await supabase
        .from("profiles")
        .select("role, first_name, last_name, phone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (prof) {
        if (prof.role) setRole(prof.role as Role);
        if (prof.first_name) setFirst(prof.first_name);
        if (prof.last_name) setLast(prof.last_name);
        if (prof.phone) setPhone(prof.phone);
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setErr(null); setMsg(null); setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); setErr("Not signed in"); return; }

    const res = await fetch("/api/profile/upsert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        role, first_name: first.trim(), last_name: last.trim(),
        phone: phone.trim() || null
      }),
    });

    const j = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || !j.ok) {
      setErr(j.error || "Could not save profile");
      return;
    }

    setMsg("Saved!");
    // route by role
    if (role === "artist") window.location.href = "/artist/home";
    else if (role === "user") window.location.href = "/user/home";
    else window.location.href = "/login";
  }

  if (loading) {
    return <main className="min-h-screen bg-black text-white grid place-items-center">Loading…</main>;
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        <p className="text-zinc-400">Tell us who you are. We’ll route you to the right dashboard.</p>

        <div className="space-y-4 rounded-2xl border border-zinc-900 bg-zinc-950/60 p-6">
          <div className="grid grid-cols-3 gap-3">
            {(["artist", "user", "guest"] as Role[]).map(r => (
              <label
                key={r}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-center ${role === r ? "border-white" : "border-zinc-800"}`}
              >
                <input
                  type="radio" name="role" value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="mr-2"
                />
                {r[0].toUpperCase() + r.slice(1)}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-zinc-400">First name</span>
              <input
                value={first}
                onChange={(e)=>setFirst(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2"
                placeholder="Alex"
              />
            </label>
            <label className="block">
              <span className="text-sm text-zinc-400">Last name</span>
              <input
                value={last}
                onChange={(e)=>setLast(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2"
                placeholder="Smith"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-zinc-400">Phone (optional)</span>
            <input
              value={phone}
              onChange={(e)=>setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2"
              placeholder="+1 555 123 4567"
            />
          </label>

          {err && <div className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-red-300">{err}</div>}
          {msg && <div className="rounded-lg border border-emerald-700 bg-emerald-900/30 p-3 text-emerald-200">{msg}</div>}

          <div className="flex gap-3">
            <button
              onClick={save}
              className="rounded-lg bg-white px-4 py-2 text-black hover:bg-zinc-200"
            >
              Save & Continue
            </button>
            <a
              href="/login"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:bg-zinc-900"
            >
              Cancel
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
