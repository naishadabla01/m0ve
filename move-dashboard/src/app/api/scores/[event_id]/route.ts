// PATH: src/app/api/scores/[event_id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ event_id: string }> }   // 👈 Promise
) {
  const { event_id } = await ctx.params;           // 👈 await it

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("scores")
    .select(
      `user_id, score,
       profiles:profiles!scores_user_id_auth_fkey(display_name, avatar_url)`
    )
    .eq("event_id", event_id)
    .order("score", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    rows: (data ?? []).map((r, i) => ({
      rank: i + 1,
      user_id: r.user_id,
      name: (r as any).profiles?.display_name ?? "Player",
      avatar_url: (r as any).profiles?.avatar_url ?? null,
      seconds: Number(r.score ?? 0),
      last_seen: null,
    })),
    revalidate: 0,
  });
}
