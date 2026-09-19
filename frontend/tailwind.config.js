/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // HDFC-inspired palette
        primary: {
          DEFAULT: '#B22222',      // Deep maroon - primary actions, header
          hover: '#8B1A1A',
          light: '#FEF2F2',        // For subtle backgrounds
        },
        banking: {
          bg: '#F7F7F8',           // Off-white background
          card: '#FFFFFF',         // Card background
          border: '#E5E5E5',       // Card borders
          text: '#1A1A1A',         // Primary text
          textMuted: '#5A5A5A',    // Secondary text
          textLight: '#8A8A8A',    // Placeholder/disabled text
        },
        success: {
          DEFAULT: '#2E7D32',      // Muted green for credits
          light: '#E8F5E9',
        },
        debit: {
          DEFAULT: '#C62828',      // Muted red for debits (slightly different from primary)
          light: '#FDEDEC',
        },
        accent: {
          gold: '#C9A227',         // Gold accent for links/secondary
          navy: '#1B3358',         // Navy for secondary actions
        },
      },
      fontFamily: {
        // Serif for headings (trustworthy, institutional)
        heading: ['Merriweather', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        // Clean sans for UI
        ui: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '8px',
        xl: '10px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        cardHover: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        header: '0 2px 8px rgba(0,0,0,0.06)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}