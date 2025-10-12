"use client";

import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-semibold">Welcome to <span className="text-green-400">MOVE</span> Event Manager</h1>
        <p className="mt-3 text-zinc-400">
          Choose how you want to continue. This choice routes the whole app experience.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {/* Artist card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-xl font-medium">Artist</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Manage concerts, generate short codes & view leaderboards.
            </p>
            <Link
              href="/login/artist"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-green-500 px-4 py-2 font-medium text-black hover:bg-green-400"
            >
              Proceed to login as Artist
            </Link>
            <p className="mt-2 text-xs text-zinc-500">
              New here?{" "}
              <Link href="/signup/artist" className="text-green-400 underline">
                Sign up
              </Link>
            </p>
          </div>

          {/* User card (placeholder) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
            <h2 className="text-xl font-medium">User</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Fans will use the mobile app to join events and track motion.
            </p>
            <button
              className="mt-6 inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-zinc-800 px-4 py-2 font-medium text-zinc-400"
              disabled
              title="Coming soon"
            >
              (Coming soon)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
