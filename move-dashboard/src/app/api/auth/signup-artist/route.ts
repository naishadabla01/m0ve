import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

// simple validation
const Body = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const body = Body.parse(payload);

    const sb = createSupabaseAdmin();

    // 1) create auth user (confirmed immediately)
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        first_name: body.first_name,
        last_name: body.last_name,
        phone: body.phone,
        role: "artist",
      },
    });
    if (createErr) {
      return NextResponse.json({ ok: false, error: createErr.message }, { status: 400 });
    }
    const userId = created.user?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "User id missing from createUser" }, { status: 500 });
    }

    // 2) ensure a profiles row exists (id = generated from user_id)
    const { error: upsertErr } = await sb
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          role: "artist",
          first_name: body.first_name,
          last_name: body.last_name,
          phone: body.phone,
          email: body.email,
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user_id: userId }, { status: 201 });
  } catch (e: any) {
    const msg =
      e?.issues?.[0]?.message // zod
      ?? e?.message
      ?? "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
