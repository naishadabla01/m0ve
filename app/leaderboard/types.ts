// types.ts - Shared TypeScript interfaces for leaderboard
export interface LeaderboardEntry {
  user_id: string;
  name: string;
  profile_picture_url?: string;
  score: number;
  rank: number;
}

export interface EventInfo {
  event_id: string;
  name?: string;
  title?: string;
  artist_name?: string;
  cover_image_url?: string;
}
