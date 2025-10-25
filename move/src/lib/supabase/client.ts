// lib/supabase/client.ts (Improved version)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import ENV from '../../../config/env';

// Validate that the URL and key are provided
if (!ENV.SUPABASE_URL || ENV.SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL') {
  console.error('❌ SUPABASE_URL is not configured!');
  console.error('Please update config/env.ts with your Supabase project URL');
  throw new Error('supabaseUrl is required.');
}

if (!ENV.SUPABASE_ANON_KEY || ENV.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  console.error('❌ SUPABASE_ANON_KEY is not configured!');
  console.error('Please update config/env.ts with your Supabase anon key');
  throw new Error('supabaseAnonKey is required.');
}

// Log for debugging (remove in production)
console.log('✅ Initializing Supabase client...');
console.log('URL:', ENV.SUPABASE_URL.substring(0, 20) + '...');

// Create Supabase client with React Native AsyncStorage
export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export for use in other files
export default supabase;