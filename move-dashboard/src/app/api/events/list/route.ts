import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: Request) {
  try {
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "No auth user" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") ?? "mine"; // mine|all|upcoming

    let q = supabase
      .from("events")
      .select("event_id, short_code, start_at, end_at, artist_id, name, title")
      .order("start_at", { ascending: false });

    if (scope === "mine") q = q.eq("artist_id", user.id);
    else if (scope === "upcoming") q = q.gte("start_at", new Date().toISOString());

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const events = (data ?? []).map((e: any) => ({
      ...e,
      display_name: e.name ?? e.title ?? "(untitled)",
    }));

    return NextResponse.json({ ok: true, events });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
