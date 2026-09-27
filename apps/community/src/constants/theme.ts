// Theme constants for the Community app
// Light, rounded, with the six rainbow flag colors assigned to activities

import type { ActivityColor } from '../types';

export const COLORS = {
  // Primary: main buttons, links, time labels
  primary: '#004DFF',
  primaryDark: '#0040D6',
  primaryLight: '#DEE8FF',

  // Secondary: busy level and confirmations
  secondary: '#008026',
  secondaryDark: '#006B20',
  secondaryLight: '#DDF2E2',

  // Accent: perks
  accent: '#750787',
  accentDark: '#5C066B',
  accentLight: '#EFDDF2',

  // Neutral colors
  background: '#FFFDF8',
  backgroundSecondary: '#F2EFE8',
  surface: '#FFFFFF',
  surfaceVariant: '#F2EFE8',

  // Text colors
  text: '#1B1B2F',
  textSecondary: '#5B5B72',
  textTertiary: '#8A8AA0',
  textInverse: '#FFFFFF',

  // Status colors
  success: '#008026',
  warning: '#B85C00',
  error: '#C50202',
  errorLight: '#FDE3E3',
  info: '#0047E0',

  // Borders and dividers
  border: '#ECE8DF',
  divider: '#ECE8DF',

  // Overlays
  overlay: 'rgba(27, 27, 47, 0.5)',
  overlayLight: 'rgba(27, 27, 47, 0.3)',

  // Feature-specific colors
  featured: '#EFDDF2',
  premium: '#750787',
};

/**
 * Each activity color as a pale tint (tile and photo fills) and a darker
 * shade (icons and labels on the tint).
 */
export const ACTIVITY_PALETTE: Record<ActivityColor, { tint: string; shade: string }> = {
  red: { tint: '#FDE3E3', shade: '#C50202' },
  orange: { tint: '#FFEBD2', shade: '#B85C00' },
  yellow: { tint: '#FFF4B0', shade: '#7A5E00' },
  green: { tint: '#DDF2E2', shade: '#008026' },
  blue: { tint: '#DEE8FF', shade: '#0047E0' },
  violet: { tint: '#EFDDF2', shade: '#750787' },
};

export const FONTS = {
  regular: 'Nunito_600SemiBold',
  medium: 'Nunito_700Bold',
  bold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const FONT_WEIGHTS = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const ICON_SIZES = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

export const LAYOUT = {
  maxWidth: 1200, // Max width for web
  headerHeight: 60,
  tabBarHeight: 60,
  cardHeight: 200,
};

export default {
  COLORS,
  ACTIVITY_PALETTE,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SHADOWS,
  ICON_SIZES,
  LAYOUT,
};
