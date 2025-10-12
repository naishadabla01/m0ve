// src/app/api/profile/upsert/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader) {
      return NextResponse.json(
        { ok: false, error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    // Bind the incoming bearer token to the server client
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    // Who is calling?
    const {
      data: { user },
      error: uerr,
    } = await supabase.auth.getUser();
    if (uerr || !user) {
      return NextResponse.json(
        { ok: false, error: uerr?.message ?? "Not authenticated" },
        { status: 401 }
      );
    }

    // Body fields we expect
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const { first_name, last_name, phone, role } = body as {
      first_name?: string;
      last_name?: string;
      phone?: string;
      role?: "artist" | "user" | "guest";
    };

    // Restrict role to known values (default to "user" if not provided)
    const safeRole: "artist" | "user" | "guest" =
      role === "artist" || role === "guest" ? role : "user";

    // Upsert profile with the auth user id as the PK
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,          // <-- IMPORTANT: satisfies NOT NULL/PK
          user_id: user.id,     // harmless if your table doesn’t have this column
          first_name,
          last_name,
          phone,
          role: safeRole,
        },
        { onConflict: "id" }
      );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user_id: user.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
