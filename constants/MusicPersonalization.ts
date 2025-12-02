// constants/MusicPersonalization.ts - Music genres and energy level configurations

export const MUSIC_GENRES = [
  { id: 'pop', label: 'Pop', icon: 'microphone-variant', color: '#ec4899', gradient: ['#ec4899', '#f472b6'] },
  { id: 'edm', label: 'EDM', icon: 'waveform', color: '#8b5cf6', gradient: ['#8b5cf6', '#a78bfa'] },
  { id: 'rock', label: 'Rock', icon: 'guitar-electric', color: '#ef4444', gradient: ['#ef4444', '#f87171'] },
  { id: 'hiphop', label: 'Hip-Hop', icon: 'playlist-music', color: '#f59e0b', gradient: ['#f59e0b', '#fbbf24'] },
  { id: 'jazz', label: 'Jazz', icon: 'saxophone', color: '#06b6d4', gradient: ['#06b6d4', '#22d3ee'] },
] as const;

export type MusicGenre = typeof MUSIC_GENRES[number]['id'];

export const ENERGY_LEVELS = [
  {
    id: 'chill',
    label: 'Chill Vibes',
    description: 'Take it easy, enjoy the flow',
    points: 1000,
    emoji: '🌊',
    icon: 'waves',
    color: '#60a5fa', // Blue
    gradient: ['#3b82f6', '#60a5fa'],
  },
  {
    id: 'hyped',
    label: 'Hyped Up',
    description: 'Bring the energy, feel the rhythm',
    points: 5000,
    emoji: '⚡',
    icon: 'lightning-bolt',
    color: '#a855f7', // Purple
    gradient: ['#a855f7', '#ec4899'],
  },
  {
    id: 'storm',
    label: 'Electric Storm',
    description: 'Unleash absolute madness',
    points: 15000,
    emoji: '🔥',
    icon: 'fire',
    color: '#ef4444', // Red/Orange
    gradient: ['#f97316', '#ef4444'],
  },
] as const;

export type EnergyLevel = typeof ENERGY_LEVELS[number]['id'];

export function getEnergyLevel(level: string) {
  return ENERGY_LEVELS.find(l => l.id === level) || ENERGY_LEVELS[0];
}

export function getGenre(genreId: string) {
  return MUSIC_GENRES.find(g => g.id === genreId);
}
