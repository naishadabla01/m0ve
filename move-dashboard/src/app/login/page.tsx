"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AuthView = "signin" | "signup";

export default function LoginPage() {
  const [view, setView] = useState<AuthView>("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [role, setRole] = useState<"artist" | "user">("artist");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // read session, but don't redirect automatically
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session ?? null);
    })();
  }, []);

  const Brand = useMemo(
    () => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-white text-black font-bold grid place-items-center">M</div>
        <span className="text-xl font-semibold tracking-wide">Move</span>
      </div>
    ),
    []
  );

  async function routeByRole() {
    setMsg("Checking profile…");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) { setErr(error.message); return; }

    const r = prof?.role ?? null;
    if (!r) { window.location.href = "/onboarding"; return; }
    if (r === "artist") { window.location.href = "/artist/home"; return; }
    window.location.href = "/user/home";
  }

  async function onSignIn() {
    setErr(null); setMsg(null); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    if (!data.session) { setMsg("Signed in, but no session created. Check auth settings."); return; }
    setSession(data.session);
    await routeByRole();
  }

  async function onSignUp() {
    setErr(null); setMsg(null); setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password: pass });
    if (error) { setLoading(false); setErr(error.message); return; }

    if (!data.session) {
      setLoading(false);
      setMsg("Sign-up ok. Please check your email to confirm, then sign in.");
      setView("signin");
      return;
    }

    // upsert minimal profile with chosen role
    const token = data.session.access_token;
    const res = await fetch("/api/profile/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        role,
        first_name: email.split("@")[0],
        last_name: role === "artist" ? "Artist" : "User",
        phone: null
      })
    });
    setLoading(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Could not save profile");
      return;
    }

    setSession(data.session);
    setMsg("Account created. Redirecting…");
    await routeByRole();
  }

  async function onSignOut() {
    setErr(null); setMsg(null); setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    setSession(null);
    setMsg("Signed out.");
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {Brand}
          <nav className="text-sm text-zinc-400">v0.1 • private preview</nav>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-2">
          {/* Left: Pitch */}
          <section className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-6">
            <h1 className="text-3xl font-semibold">Host motion-powered shows</h1>
            <p className="mt-3 text-zinc-400">
              Artists create events and watch fans compete live on the leaderboard.
              Fans join with a 6-digit code or QR, and their movement turns into score.
            </p>
            <ul className="mt-6 space-y-2 text-zinc-300">
              <li>• Create events with a single click (6-digit join code)</li>
              <li>• Live leaderboard and stage screen</li>
              <li>• Video call (LiveKit) coming soon</li>
            </ul>
          </section>

          {/* Right: Auth Card */}
          <section className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-6">
            {/* If already signed in, show session banner instead of auto-redirect */}
            {session ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-700 bg-emerald-900/30 p-3 text-emerald-200">
                  Signed in as <span className="underline">{session.user.email}</span>.
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={routeByRole}
                    className="rounded-lg bg-white px-4 py-2 text-black hover:bg-zinc-200"
                  >
                    Continue
                  </button>
                  <button
                    onClick={onSignOut}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:bg-zinc-900"
                  >
                    Sign out
                  </button>
                </div>
                {err && <div className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-red-300">{err}</div>}
                {msg && <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-zinc-200">{msg}</div>}
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <button
                    onClick={() => setView("signin")}
                    className={`rounded-lg px-3 py-1 text-sm ${view === "signin" ? "bg-white text-black" : "bg-zinc-900 text-zinc-300"}`}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => setView("signup")}
                    className={`rounded-lg px-3 py-1 text-sm ${view === "signup" ? "bg-white text-black" : "bg-zinc-900 text-zinc-300"}`}
                  >
                    Sign up
                  </button>
                </div>

                {view === "signup" && (
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <label className={`cursor-pointer rounded-lg border px-3 py-2 ${role === "artist" ? "border-white" : "border-zinc-800"}`}>
                      <input
                        type="radio"
                        name="role"
                        value="artist"
                        checked={role === "artist"}
                        onChange={() => setRole("artist")}
                        className="mr-2"
                      />
                      Artist
                    </label>
                    <label className={`cursor-pointer rounded-lg border px-3 py-2 ${role === "user" ? "border-white" : "border-zinc-800"}`}>
                      <input
                        type="radio"
                        name="role"
                        value="user"
                        checked={role === "user"}
                        onChange={() => setRole("user")}
                        className="mr-2"
                      />
                      User
                    </label>
                  </div>
                )}

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm text-zinc-400">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2"
                      placeholder="you@example.com"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm text-zinc-400">Password</span>
                    <input
                      type="password"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2"
                      placeholder="••••••••"
                    />
                  </label>

                  {err && (
                    <div className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-red-300">
                      {err}
                    </div>
                  )}
                  {msg && (
                    <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-zinc-200">
                      {msg}
                    </div>
                  )}

                  <button
                    onClick={view === "signin" ? onSignIn : onSignUp}
                    disabled={loading}
                    className="w-full rounded-lg bg-white py-2 text-black hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {loading
                      ? view === "signin" ? "Signing in…" : "Creating…"
                      : view === "signin" ? "Sign in" : "Create account"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-black/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} Move. All rights reserved.</span>
          <span>Build for artists • Private beta</span>
        </div>
      </footer>
    </div>
  );
}
