// app/dev/ping/page.tsx  (or wherever your ping UI lives)
'use client';
import { useState } from 'react';

export default function DevPing() {
  const [input, setInput] = useState(''); // event_id or short code
  const [result, setResult] = useState<any>(null);

  const send = async () => {
    setResult(null);

    // allow UUID or 6-digit short code; the function can accept UUID
    // if you're storing short codes, resolve them server-side before calling ingest
    const body = {
      event_id: input.trim(), // <- MUST be event_id (not user id)
      accel: 1.2,
      steps: 0,
    };

    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      setResult({ ok: res.ok, json: j });
    } catch (e: any) {
      setResult({ ok: false, error: String(e) });
    }
  };

  return (
    <main style={{ padding: 24, color: '#eee', background: '#0b0f1a', minHeight: '100vh' }}>
      <h2>Ping ingest</h2>
      <p style={{ opacity: .7, marginTop: 8 }}>
        Enter <b>event_id</b> (UUID or 6-digit code) then send. This calls <code>/api/call</code> which
        proxies to your Edge Function with the service key (no CORS issues).
      </p>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="event_id (UUID or 6-digit code)"
        style={{ width: '100%', marginTop: 12, padding: 10, borderRadius: 8, background: '#111827', color: 'white', border: '1px solid #243244' }}
      />
      <button onClick={send} style={{ marginTop: 12, padding: '10px 16px', borderRadius: 8, background: '#4f46e5', color: 'white' }}>
        Send
      </button>

      <pre style={{ marginTop: 20, background: '#0f1321', padding: 16, borderRadius: 12, border: '1px solid #1f2937', overflow: 'auto' }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </main>
  );
}
