import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,         // ✅ real URL from .env.local
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!     // ✅ real publishable key
);
