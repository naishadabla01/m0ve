// config/env.ts
// Environment configuration for the Move app
// This file should NOT be committed to version control if it contains sensitive data

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  LIVEKIT_URL: string;
  API_URL: string;
  // Add other environment variables here as needed
}

const ENV: EnvConfig = {
  // Replace with your actual Supabase project credentials
  SUPABASE_URL: 'https://jxjaqamunkkqnwhrlnzk.supabase.co', // e.g., 'https://xxxxx.supabase.co'
  SUPABASE_ANON_KEY: 'sb_publishable_w7Zh42w1bNPIe3kicNVEEw_dBqEq_2I', // Your public anon key

  // LiveKit configuration for video calls
  LIVEKIT_URL: 'wss://move-h8w0xjau.livekit.cloud',

  // Backend API URL (update with your Railway deployment URL)
  API_URL: 'http://localhost:3000', // Change to your Railway URL when deployed
};

export default ENV;