import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Put your values here (or read from constants/env)
export const SUPABASE_URL = 'https://jxjaqamunkkqnwhrlnzk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_w7Zh42w1bNPIe3kicNVEEw_dBqEq_2I';



export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storage: AsyncStorage,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
