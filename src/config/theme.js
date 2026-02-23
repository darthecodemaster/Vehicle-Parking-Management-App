// ============================================================
// theme.js — Design System Constants
// ============================================================
// All colors, spacing, fonts, and shadows used across the app.
// Mirrors the web dashboard CSS variables for visual consistency.
// ============================================================

export const COLORS = {
  // Primary brand colors (match --accent-blue and gradient in web dashboard)
  primary: '#4A90E2',
  primaryLight: '#6EC1E4',
  primaryDark: '#2E6BB0',

  // Background gradient (same as web dashboard body gradient)
  gradientStart: '#6EC1E4',
  gradientMid: '#5FA8D3',
  gradientEnd: '#4A90E2',

  // Sidebar and card backgrounds
  sidebar: '#D9E1E8',
  card: '#F5F7FA',
  white: '#FFFFFF',

  // Text
  textPrimary: '#333333',
  textSecondary: '#666666',
  textMuted: '#8A9BB0',

  // Status colors
  checkIn: '#2ECC71',    // Green — occupied / checked in
  checkOut: '#FF6B6B',   // Red — checked out / error
  reserved: '#FFA502',   // Orange — reserved slots
  available: '#4A90E2',  // Blue — available count

  // Slot status backgrounds
  slotAvailableBg: '#E8F5E9',
  slotAvailableBorder: '#A5D6A7',
  slotAvailableText: '#2E7D32',

  slotOccupiedBg: '#FFEBEE',
  slotOccupiedBorder: '#EF9A9A',
  slotOccupiedText: '#C62828',

  slotReservedBg: '#FFF8E1',
  slotReservedBorder: '#FFE082',
  slotReservedText: '#F57F17',

  // Alerts and danger
  danger: '#FF4757',
  warning: '#FFA502',
  success: '#2ECC71',

  // Misc
  border: '#E6EDF3',
  inputBg: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
};

export const FONTS = {
  // Use system fonts that are available on both iOS and Android
  heading: 'System',  // Replace with 'Outfit' if you load expo-font
  body: 'System',     // Replace with 'DMSans' if you load expo-font
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOW = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};
