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
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4amFxYW11bmtrcW53aHJsbnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjkyMjIsImV4cCI6MjA3NDg0NTIyMn0.xp3nDY0b2W7blNFDEg2XoVAUkY4ELu2r1FfDYCcZnqk', // Your public anon key

  // LiveKit configuration for video calls
  LIVEKIT_URL: 'wss://move-h8w0xjau.livekit.cloud',

  // Backend API URL
  // For local testing: Use your Mac's local IP (see below)
  // For production: Use Railway URL
  API_URL: 'https://move-dashboard-deploy-production.up.railway.app'  // Production Railway URL
};

export default ENV;