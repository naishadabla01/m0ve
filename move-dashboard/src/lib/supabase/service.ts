// move-dashboard/src/lib/supabase/service.ts
import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL; // fallback if you ever add it
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("Supabase URL missing (NEXT_PUBLIC_SUPABASE_URL).");
if (!serviceKey)
  throw new Error("Service key missing (SUPABASE_SERVICE_ROLE_KEY).");

export const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
