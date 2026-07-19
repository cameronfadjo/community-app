// Theme constants for the Community app
// Using a vibrant, inclusive color palette

export const COLORS = {
  // Primary brand colors (rich blue/teal palette)
  primary: '#0EA5E9', // Sky Blue
  primaryDark: '#0284C7',
  primaryLight: '#7DD3FC',

  // Secondary colors
  secondary: '#14B8A6', // Teal
  secondaryDark: '#0D9488',
  secondaryLight: '#5EEAD4',

  // Accent colors
  accent: '#06B6D4', // Cyan
  accentDark: '#0891B2',
  accentLight: '#67E8F9',

  // Neutral colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F3F5',

  // Text colors
  text: '#1A1A1A',
  textSecondary: '#6C757D',
  textTertiary: '#ADB5BD',
  textInverse: '#FFFFFF',

  // Status colors
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  info: '#17A2B8',

  // Borders and dividers
  border: '#DEE2E6',
  divider: '#E9ECEF',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Feature-specific colors
  featured: '#06B6D4',
  premium: '#0EA5E9',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
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
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SHADOWS,
  ICON_SIZES,
  LAYOUT,
};
