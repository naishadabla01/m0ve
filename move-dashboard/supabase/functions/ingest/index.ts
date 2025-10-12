// supabase/functions/ingest/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";

const PROJECT_URL      = Deno.env.get("PROJECT_URL")!;
const ANON_KEY         = Deno.env.get("ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function err(e: unknown, status = 400) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "object" ? JSON.stringify(e) : String(e);
  return json({ ok: false, error: msg }, status);
}

Deno.serve(async (req) => {
  try {
    // parse body (don’t start any servers here!)
    const raw = await req.text();
    let body: any = {};
    if (raw) {
      try { body = JSON.parse(raw); } catch { return err("invalid json", 400); }
    }

    // prefer JWT; allow user_id override for local tests
    const authed = createClient(PROJECT_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await authed.auth.getUser();
    
    const user_id = u?.user?.id;
  if (!user_id) return err("no user (missing session)", 401);

    const event_id: string = body.event_id ?? body.eventId;
    if (!event_id) return err("missing event_id", 400);

    const accel = Number(body.accel ?? 0);
    const steps = Number(body.steps ?? 0);

    const admin = createClient(PROJECT_URL, SERVICE_ROLE_KEY, { global: { fetch } });

    // optional: store raw sample
    if (Number.isFinite(accel) || Number.isFinite(steps)) {
      await admin.from("motion_samples")
        .insert({ event_id, user_id, accel, steps })
        .throwOnError();
    }

    // decay + upsert score
    const DECAY = 0.98;
    const STEP_K = 3;
    const inc = Math.min(5, Math.max(0, accel)) + steps * STEP_K;

    const { data: cur } = await admin
      .from("scores").select("score")
      .eq("event_id", event_id)
      .eq("user_id", user_id)
      .single();

    const next = (cur?.score ?? 0) * DECAY + inc;

    const { data: row, error } = await admin
      .from("scores")
      .upsert({ event_id, user_id, score: next, last_update: new Date().toISOString() })
      .select()
      .single();

    if (error) return err(error, 500);
    return json({ ok: true, row });
  } catch (e) {
    return err(e, 500);
  }
});
