// utils.ts - Helper functions for leaderboard

/**
 * Returns emoji based on rank position
 */
export function getRankEmoji(rank: number): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

/**
 * Returns color based on rank position
 */
export function getRankColor(rank: number): string {
  if (rank === 1) return "#ffd700"; // Gold
  if (rank === 2) return "#c0c0c0"; // Silver
  if (rank === 3) return "#cd7f32"; // Bronze
  return "#a855f7"; // Purple default
}
