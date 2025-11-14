/**
 * iOS 26 Design System - Move Platform
 * Glassmorphism aesthetic with purple/pink gradients
 * Matches dashboard at: https://move-dashboard-deploy-production.up.railway.app
 */

import { Platform } from 'react-native';

/**
 * Color Palette - iOS 26 Theme
 * Primary: Purple (#a855f7) and Pink (#ec4899)
 */
export const Colors = {
  // Background colors
  background: {
    primary: '#0a0a0a',      // Deep black
    secondary: '#151718',     // Slightly lighter black
    card: 'rgba(0, 0, 0, 0.4)', // Transparent black for glass cards
  },

  // Text colors
  text: {
    primary: '#FFFFFF',       // White
    secondary: '#ECEDEE',     // Light gray
    muted: '#9BA1A6',         // Gray
    tertiary: '#687076',      // Darker gray
  },

  // Accent colors - Purple
  accent: {
    purple: {
      light: '#a855f7',       // purple-500
      DEFAULT: '#9333ea',     // purple-600
      dark: '#7e22ce',        // purple-700
    },
    pink: {
      light: '#ec4899',       // pink-500
      DEFAULT: '#db2777',     // pink-600
      dark: '#be185d',        // pink-700
    },
  },

  // Border colors
  border: {
    glass: 'rgba(255, 255, 255, 0.1)',  // white/10
    subtle: 'rgba(255, 255, 255, 0.05)', // white/5
    strong: 'rgba(255, 255, 255, 0.2)',  // white/20
  },

  // Status colors
  status: {
    success: '#10b981',      // emerald-500
    error: '#ef4444',        // red-500
    warning: '#f59e0b',      // amber-500
    info: '#3b82f6',         // blue-500
    live: '#10b981',         // green for "live" indicators
  },
};

/**
 * Gradient Definitions
 * Used for glassmorphism cards and buttons
 */
export const Gradients = {
  // Glassmorphism card gradient (light transparency)
  glass: {
    light: [
      'rgba(168, 85, 247, 0.1)',  // purple-500/10
      'rgba(0, 0, 0, 0.4)',        // black/40
      'rgba(236, 72, 153, 0.1)',   // pink-500/10
    ] as const,
    medium: [
      'rgba(168, 85, 247, 0.15)',  // purple-500/15
      'rgba(0, 0, 0, 0.5)',         // black/50
      'rgba(236, 72, 153, 0.15)',   // pink-500/15
    ] as const,
    dark: [
      'rgba(168, 85, 247, 0.05)',   // purple-500/5
      'rgba(0, 0, 0, 0.6)',          // black/60
      'rgba(236, 72, 153, 0.05)',    // pink-500/5
    ] as const,
  },

  // Purple to Pink gradient (for buttons, highlights)
  purplePink: {
    start: '#a855f7',  // purple-500
    end: '#ec4899',    // pink-500
  },

  // Purple gradient
  purple: {
    start: '#9333ea',  // purple-600
    end: '#7e22ce',    // purple-700
  },

  // Pink gradient
  pink: {
    start: '#ec4899',  // pink-500
    end: '#be185d',    // pink-700
  },
};

/**
 * Spacing Scale (8pt grid system)
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

/**
 * Border Radius (iOS 26 rounded corners)
 */
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 32,   // Signature iOS 26 rounded-[2rem]
  '3xl': 48,
  full: 9999,
};

/**
 * Typography
 */
export const Typography = {
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

/**
 * Shadows (iOS 26 glow effects)
 */
export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: Colors.accent.purple.light,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: Colors.accent.purple.light,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: Colors.accent.purple.light,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
  xl: Platform.select({
    ios: {
      shadowColor: Colors.accent.purple.light,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
    },
    android: {
      elevation: 12,
    },
    default: {},
  }),
  // Pink shadow variant
  pink: Platform.select({
    ios: {
      shadowColor: Colors.accent.pink.light,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
};

/**
 * Animation Durations (milliseconds)
 */
export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
};

/**
 * Opacity Levels
 */
export const Opacity = {
  disabled: 0.4,
  inactive: 0.6,
  active: 1.0,
  subtle: 0.1,
  medium: 0.5,
};
