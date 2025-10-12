import { supabase } from "./supabase/client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveEventId(eventRef: string): Promise<string> {
  if (UUID_RE.test(eventRef)) return eventRef;

  const { data, error } = await supabase
    .from("events")
    .select("event_id")
    .or(`code.eq.${eventRef},short_code.eq.${eventRef}`)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Event not found for code/short_code: " + eventRef);
  return data.event_id as string;
}

export async function insertMotionEvent(params: {
  eventRef: string;   // uuid or code/short_code
  magnitude: number;
}) {
  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr) throw uerr;
  if (!user) throw new Error("No signed-in user");

  const event_id = await resolveEventId(params.eventRef);

  const { error } = await supabase.from("motion_events").insert({
    user_id: user.id,
    event_id,
    magnitude: params.magnitude,
  });
  if (error) throw error;

  return { event_id, user_id: user.id, magnitude: params.magnitude };
}
