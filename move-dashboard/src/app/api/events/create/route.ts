// src/app/api/events/create/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { title, start_at } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { data: me, error: meErr } = await supabase.auth.getUser();
    if (meErr || !me?.user) {
      return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
    }

    const userId = me.user.id;

    // Build payload without nulls so DB defaults apply
    const payload: any = {
      title,
      created_by: userId,
      artist_id: userId,
    };
    if (start_at) payload.start_at = start_at; // otherwise let DEFAULT now() apply

    const { data, error } = await supabase
      .from("events")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, event: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
