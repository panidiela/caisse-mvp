// src/constants/theme.ts

export const COLORS = {
  primary: '#1B4332',
  primaryLight: '#2D6A4F',
  accent: '#F4A261',
  accentDark: '#E76F51',
  bg: '#F8F9FA',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#DEE2E6',
  success: '#28A745',
  danger: '#DC3545',
  warning: '#FFC107',
  info: '#17A2B8',

  // Status colors
  free: '#28A745',
  occupied: '#E76F51',
  waiting_payment: '#FFC107',
  paid: '#6C757D',

  // Role colors
  server: '#2D6A4F',
  cashier: '#1B4332',
  manager: '#264653',
};

export const FONT = {
  regular: 'System',
  bold: 'System',
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
};
