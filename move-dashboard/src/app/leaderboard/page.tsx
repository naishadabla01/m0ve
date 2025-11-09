// PATH: src/app/leaderboard/page.tsx
import LeaderboardClient from "./LeaderboardClient";
import EnergyPanel from "@/components/leaderboard/EnergyPanel";

export default async function LeaderboardPage({
  searchParams,
}: { searchParams: Promise<{ event_id?: string }> }) {
  const sp = await searchParams;
  const eventId = (sp?.event_id ?? "").trim();

  if (!eventId) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-300">
        Missing <span className="font-mono text-zinc-100">event_id</span> in URL.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-6">
      {/* 👇 pass the prop and add key to ensure the client component re-mounts */}
      <EnergyPanel key={eventId} eventId={eventId} />
      <LeaderboardClient />
    </div>
  );
}


