// Centralized Theme Tokens for Poddesk OS
// These ensure consistency for high-level structure and design language

export const THEME = {
  colors: {
    base: {
      deepNavy: '#0A0E17',
      navySurfaces: '#121A2F',
      elevatedCard: '#1E2943',
    },
    accent: {
      electricBlue: '#3B82F6',
      electricBlueHover: '#2563EB',
    },
    text: {
      primary: '#F9FAFB',
      secondary: '#9CA3AF',
      muted: '#6B7280',
    },
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6'
    }
  },
  spacing: {
    pageNavOffset: '64px', // e.g., the height of the top navigation bar
    sectionGap: '2rem',
    componentGap: '1rem',
  },
  radius: {
    card: '0.75rem',
    button: '0.5rem',
    badge: '9999px' // full
  }
};
