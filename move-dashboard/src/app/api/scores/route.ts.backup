import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row<T> = T extends Array<infer U> ? U : never;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get("event_id") || "";
    if (!event_id) {
      return NextResponse.json({ ok: false, error: "missing event_id" }, { status: 400 });
    }

    // ✅ ADDED: Fetch event details
    const { data: event, error: eventErr } = await sb
      .from("events")
      .select("name, title, short_code")
      .eq("event_id", event_id)
      .maybeSingle();

    if (eventErr) console.error("Failed to fetch event:", eventErr);

    const eventName = event?.name || event?.title || null;
    const shortCode = event?.short_code || null;

    // 1) Base rows from participants (seconds + last_seen)
    const { data: parts, error: partsErr } = await sb
      .from("event_participants")
      .select("user_id, seconds, last_seen")
      .eq("event_id", event_id);

    if (partsErr) throw partsErr;

    // 2) Fetch profiles for the involved users
    const userIds = Array.from(new Set((parts ?? []).map(p => (p as any).user_id))).filter(Boolean);
    let nameByUser = new Map<string, string>();
    if (userIds.length) {
      const { data: profs, error: profErr } = await sb
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", userIds);

      if (profErr) throw profErr;

      for (const p of profs ?? []) {
        const uid = (p as any).user_id as string;
        const dn  = ((p as any).display_name || "").trim();
        const fn  = ((p as any).first_name   || "").trim();
        const ln  = ((p as any).last_name    || "").trim();
        const full = dn || [fn, ln].filter(Boolean).join(" ").trim();
        if (uid) nameByUser.set(uid, full);
      }
    }

    // 3) Build leaderboard rows (add "name")
    const rows = (parts ?? []).map(p => {
      const u = (p as Row<typeof parts>).user_id as string;
      const seconds = (p as any).seconds ?? 0;
      const last_seen = (p as any).last_seen as string | null;

      // fallback if no profile
      const fallback = `${u.slice(0, 6)}…${u.slice(-4)}`;
      const name = (nameByUser.get(u) || "").trim() || fallback;

      return { 
        user_id: u, 
        seconds,  // ✅ Keep original field
        score: seconds,  // ✅ ADDED: Also provide as 'score' for compatibility
        last_seen, 
        name,
        display_name: name  // ✅ ADDED: Alias for display_name
      };
    });

    // Sort by score
    rows.sort((x, y) => (y.seconds ?? 0) - (x.seconds ?? 0));

    return NextResponse.json(
      { 
        ok: true, 
        rows,  // ✅ Keep original field
        scores: rows,  // ✅ ADDED: Also provide as 'scores' for compatibility
        event_name: eventName,  // ✅ ADDED
        event_title: eventName,  // ✅ ADDED: Alias
        short_code: shortCode,  // ✅ ADDED
        revalidate: 0 
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}