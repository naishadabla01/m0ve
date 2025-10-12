// move-dashboard/src/app/artist/events/[event_id]/qr/page.tsx
import { admin } from "@/src/lib/supabase/service";
import Image from "next/image";
import Link from "next/link";

type Props = { params: { event_id: string } };

function buildUrls(host: string, code: string) {
  const web = `https://${host}/leaderboard?code=${code}`;
  const deep = `move://join?code=${code}`;
  return { web, deep };
}

export default async function EventQrPage({ params: { event_id } }: Props) {
  // Load event to read code (and fallback to event_id if code is null)
  const { data: evRows, error } = await admin
    .from("events")
    .select("event_id, code, name")
    .eq("event_id", event_id)
    .limit(1);

  if (error || !evRows?.length) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">QR</h1>
        <p className="text-red-400 mt-2">Event not found.</p>
      </main>
    );
  }

  const ev = evRows[0];
  const code = ev.code ?? ev.event_id; // always have something
  const host = process.env.NEXT_PUBLIC_HOST ??
               (process.env.VERCEL_URL || "localhost:3000");
  const { web, deep } = buildUrls(host, code);

  // We’ll render two QR codes: web and app deep link.
  const size = 480;
  const qrWebSrc = `/api/qr?text=${encodeURIComponent(web)}&size=${size}`;
  const qrDeepSrc = `/api/qr?text=${encodeURIComponent(deep)}&size=${size}`;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Event QR</h1>
        <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-200">{code}</span>
      </div>
      <p className="text-zinc-400 mt-1">{ev.name ?? ev.event_id}</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Web viewer QR */}
        <div className="rounded-xl border border-zinc-800 p-4">
          <h2 className="font-medium">Audience Leaderboard</h2>
          <p className="text-sm text-zinc-400 mb-3">Opens a read-only leaderboard in the browser.</p>
          <div className="bg-white rounded-xl p-3 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrWebSrc} alt="web qr" width={size} height={size} />
          </div>
          <p className="mt-3 text-xs break-all text-zinc-400">{web}</p>
          <div className="mt-3 flex gap-2">
            <Link className="rounded bg-white text-black px-3 py-1" href={web} target="_blank">Open</Link>
            <a className="rounded border border-zinc-700 px-3 py-1"
               href={qrWebSrc}
               download={`event-${code}-web.png`}>
              Download PNG
            </a>
          </div>
        </div>

        {/* App deep-link QR */}
        <div className="rounded-xl border border-zinc-800 p-4">
          <h2 className="font-medium">Join in Move App</h2>
          <p className="text-sm text-zinc-400 mb-3">Deep link for the Move mobile app.</p>
          <div className="bg-white rounded-xl p-3 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDeepSrc} alt="app qr" width={size} height={size} />
          </div>
          <p className="mt-3 text-xs break-all text-zinc-400">{deep}</p>
          <div className="mt-3 flex gap-2">
            <a className="rounded border border-zinc-700 px-3 py-1"
               href={qrDeepSrc}
               download={`event-${code}-app.png`}>
              Download PNG
            </a>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        Tip: print these or show on screens at the venue. iOS users without deep-link setup can
        still scan the web QR and join after landing on the leaderboard.
      </p>
    </main>
  );
}
