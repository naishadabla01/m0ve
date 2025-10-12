import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getEventId(ref: string) {
  const supabase = createSupabaseServerClient();

  // if ref is a uuid, use it directly
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
    return ref;
  }

  // otherwise resolve via code/short_code
  const { data, error } = await supabase
    .from("events")
    .select("event_id")
    .or(`code.eq.${ref},short_code.eq.${ref}`)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Event not found");
  return data.event_id as string;
}

export async function getLeaderboard(eventRef: string) {
  const supabase = createSupabaseServerClient();
  const event_id = await getEventId(eventRef);

  const { data, error } = await supabase
    .from("scores")
    .select(`
      event_id,
      user_id,
      score,
      updated_at,
      profiles:profiles(display_name)
    `)
    .eq("event_id", event_id)
    .order("score", { ascending: false })
    .limit(100);

  if (error) throw error;
  return { event_id, rows: data ?? [] };
}
