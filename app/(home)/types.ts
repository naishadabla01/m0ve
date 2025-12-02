// types.ts - Shared type definitions for home screen
export interface Event {
  event_id: string;
  artist_id: string;
  artist_name?: string | null;
  name: string | null;
  title?: string | null;
  short_code?: string | null;
  location?: string | null;
  cover_image_url?: string | null;
  cover_url?: string | null; // fallback for backward compatibility
  start_at: string | null;
  end_at: string | null;
  ended_at: string | null;
  status: string | null;
  actualStatus?: 'live' | 'ended' | 'scheduled';
}
