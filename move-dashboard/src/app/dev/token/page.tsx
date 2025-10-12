'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../src/lib/supabase';

type Decoded = {
  header?: any;
  payload?: any;
  error?: string;
};

function decodeJwtParts(jwt: string): Decoded {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) {
      return { error: 'Not a JWT (needs header.payload.signature).' };
    }
    const [h, p] = parts;
    const header = JSON.parse(atob(h.replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
    return { header, payload };
  } catch (e: any) {
    return { error: e?.message || 'Failed to decode token.' };
  }
}

export default function TokenTesterPage() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const [pasteToken, setPasteToken] = useState('');
  const decoded = useMemo(() => (pasteToken ? decodeJwtParts(pasteToken) : {}), [pasteToken]);

  // Load current session
  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    setSessionToken(token ?? null);
    setUserId(data.session?.user?.id ?? null);
    // exp is seconds since epoch
    setExpiresAt(data.session?.expires_at ?? null);
  };

  useEffect(() => {
    refresh();
    // Also listen to auth changes (optional)
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInAnon = async () => {
    await supabase.auth.signInAnonymously();
    await refresh();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await refresh();
  };

  const copyAuthHeader = async () => {
    if (!sessionToken) return;
    await navigator.clipboard.writeText(`Bearer ${sessionToken}`);
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
      {/* Title */}
      <section className="rounded-2xl p-6 bg-[#0f1321] ring-1 ring-white/5">
        <h1 className="text-2xl font-bold text-white">Token Tester</h1>
        <p className="text-slate-400 mt-1">
          This page shows your current Supabase user session token and lets you paste any JWT to decode its header/payload.
        </p>
      </section>

      {/* Current session */}
      <section className="rounded-2xl p-6 bg-[#0f1321] ring-1 ring-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Current session</h2>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              className="rounded-lg bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-sm"
            >
              Refresh
            </button>
            <button
              onClick={signInAnon}
              className="rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 text-sm"
            >
              Sign in anonymously
            </button>
            <button
              onClick={signOut}
              className="rounded-lg bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-sm"
            >
              Sign out
            </button>
          </div>
        </div>

        {sessionToken ? (
          <>
            <pre className="rounded-xl bg-black/30 ring-1 ring-white/10 p-4 text-sm text-slate-200 overflow-x-auto">
{`{
  "projectUrl": "${process.env.NEXT_PUBLIC_SUPABASE_URL}",
  "anonKeyTail": "${(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').slice(-8)}",
  "userId": "${userId ?? ''}",
  "expiresAt": ${expiresAt ?? 'null'}
}`}
            </pre>

            <div>
              <p className="text-slate-300 mb-1">
                Use this in <span className="font-semibold">Authorization</span> header:
              </p>
              <div className="rounded-xl bg-black/30 ring-1 ring-white/10 p-3 text-slate-200 text-sm overflow-x-auto">
                <div className="font-mono text-slate-400 mb-1">Bearer</div>
                <div className="font-mono break-words">{sessionToken}</div>
            </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={copyAuthHeader}
                  className="rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 text-sm"
                >
                  Copy header
                </button>
                <span className="text-emerald-400 text-sm">
                  ✓ This is a <strong>USER</strong> session token (do not paste your anon key here).
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-black/30 ring-1 ring-white/10 p-4 text-sm text-slate-300">
            No session found. Click <span className="font-semibold">Sign in anonymously</span> above to create one.
          </div>
        )}
      </section>

      {/* Paste & decode any token */}
      <section className="rounded-2xl p-6 bg-[#0f1321] ring-1 ring-white/5 space-y-4">
        <h2 className="text-white font-semibold">Decode any JWT (paste below)</h2>
        <textarea
          value={pasteToken}
          onChange={(e) => setPasteToken(e.target.value)}
          placeholder="Paste a JWT here to decode header & payload"
          rows={5}
          className="w-full rounded-xl bg-black/30 ring-1 ring-white/10 p-3 text-slate-200 font-mono placeholder:text-slate-500"
        />
        {pasteToken ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-black/30 ring-1 ring-white/10 p-4">
              <div className="text-slate-300 font-semibold mb-2">Header</div>
              <pre className="text-slate-200 text-sm overflow-x-auto">
                {decoded.error ? decoded.error : JSON.stringify(decoded.header, null, 2)}
              </pre>
            </div>
            <div className="rounded-xl bg-black/30 ring-1 ring-white/10 p-4">
              <div className="text-slate-300 font-semibold mb-2">Payload</div>
              <pre className="text-slate-200 text-sm overflow-x-auto">
                {decoded.error ? decoded.error : JSON.stringify(decoded.payload, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Nothing pasted yet.</p>
        )}
        <p className="text-slate-500 text-xs">
          Note: This only decodes the header/payload (base64). Signature verification requires the signing secret and
          is not performed here.
        </p>
      </section>
    </main>
  );
}
