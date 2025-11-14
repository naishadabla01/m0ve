// src/lib/scoreUtils.ts
// Score normalization utilities
//
// IMPORTANT: The backend currently accumulates raw accelerometer values,
// resulting in scores in the thousands (e.g., 5310 for 10 minutes).
//
// This utility provides frontend normalization to display scores on a 1-10 scale
// until the backend can be updated to use a proper 1-10 energy scale.
//
// BACKEND TODO: Update /api/motion to calculate scores on a 1-10 scale:
// - Use intensity levels (idle=0, low=2, medium=4, high=7, extreme=10)
// - Calculate average intensity per time window
// - Store normalized values instead of raw accumulation

/**
 * Normalization factor to convert raw scores to a 1-10 scale
 * Based on observation: 10 mins of movement = ~5310 points
 * This gives us ~531 points per minute, or ~8.85 points per second
 *
 * For a 1-10 scale, we'll aim for reasonable numbers:
 * - 10 mins of active movement = ~50-100 points (5-10 per minute)
 */
const SCORE_NORMALIZATION_FACTOR = 100;

/**
 * Convert raw backend score to display score (1-10 scale equivalent)
 * @param rawScore - Raw score from database (in thousands)
 * @returns Normalized score for display (reasonable numbers)
 */
export function normalizeScoreForDisplay(rawScore: number): number {
  return Math.round(rawScore / SCORE_NORMALIZATION_FACTOR);
}

/**
 * Get energy level (1-10) based on current movement intensity
 * This represents what the backend SHOULD be storing
 */
export function getEnergyLevel(intensity: 'idle' | 'low' | 'medium' | 'high' | 'extreme'): number {
  switch (intensity) {
    case 'extreme': return 10;
    case 'high': return 7;
    case 'medium': return 4;
    case 'low': return 2;
    case 'idle': return 0;
    default: return 0;
  }
}

/**
 * Format score for display with appropriate suffix
 */
export function formatScore(rawScore: number): string {
  const normalized = normalizeScoreForDisplay(rawScore);
  return normalized.toLocaleString();
}

/**
 * Calculate progress percentage with reasonable goal
 * Instead of 10,000 raw points, use 100 normalized points
 */
export function calculateProgress(rawScore: number): number {
  const normalized = normalizeScoreForDisplay(rawScore);
  const goal = 100; // Reasonable goal: 100 points
  return Math.min(100, Math.round((normalized / goal) * 100));
}
