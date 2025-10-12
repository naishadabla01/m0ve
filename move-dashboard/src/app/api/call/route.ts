// src/app/api/call/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic'; // avoid caching

export async function POST(req: NextRequest) {
  try {
    const CALL_ENDPOINT = process.env.CALL_ENDPOINT;
    if (!CALL_ENDPOINT) {
      return NextResponse.json(
        { ok: false, error: 'CALL_ENDPOINT missing' },
        { status: 500 }
      );
    }

    // 1) Read the signed-in user/session from Supabase cookies
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
      error: sessErr,
    } = await supabase.auth.getSession();

    if (sessErr) {
      return NextResponse.json(
        { ok: false, error: sessErr.message },
        { status: 500 }
      );
    }
    if (!session?.access_token) {
      return NextResponse.json(
        { ok: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 2) Forward the request body to your call token endpoint,
    //    adding the Supabase JWT as Bearer (so your function
    //    can authorize the caller).
    const bodyText = await req.text();
    const resp = await fetch(CALL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: bodyText,
      cache: 'no-store',
    });

    // 3) Return the upstream response verbatim (JSON or text)
    const raw = await resp.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // non-JSON is fine; we’ll passthrough as text
    }

    return NextResponse.json(
      { ok: resp.ok, status: resp.status, body: parsed ?? raw },
      { status: resp.status }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
