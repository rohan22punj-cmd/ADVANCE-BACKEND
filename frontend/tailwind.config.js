/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#8B0000',
          dark: '#610000',
          light: '#B22222',
          subtle: '#FCF6F6',
          border: '#F3DADA'
        },
        surface: {
          canvas: '#F7F7F8',
          card: '#FFFFFF',
          muted: '#F1F3F5'
        },
        slate: {
          charcoal: '#111827',
          deep: '#1E293B',
          muted: '#4B5563',
          subtle: '#64748B'
        },
        banking: {
          bg: '#F7F7F8',
          card: '#FFFFFF',
          border: '#E5E5E5',
          text: '#1A1A1A',
          textMuted: '#5A5A5A',
          textLight: '#8A8A8A',
        },
        success: {
          DEFAULT: '#2E7D32',
          light: '#E8F5E9',
        },
        debit: {
          DEFAULT: '#C62828',
          light: '#FDEDEC',
        },
        primary: {
          DEFAULT: '#8B0000',
          hover: '#610000',
          light: '#B22222',
          subtle: '#FCF6F6',
          border: '#F3DADA'
        },
        accent: {
          gold: '#C9A227',
          navy: '#1B3358',
        },
      },
      fontFamily: {
        heading: ['Merriweather', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 20px -2px rgba(17, 24, 39, 0.05), 0 2px 6px -1px rgba(17, 24, 39, 0.02)',
        'float': '0 20px 40px -15px rgba(17, 24, 39, 0.08), 0 0 1px 1px rgba(17, 24, 39, 0.04)',
        'glow-maroon': '0 8px 24px -4px rgba(139, 0, 0, 0.25)',
      },
      animation: {
        'float-subtle': 'floatMockup 7s ease-in-out infinite',
      },
      keyframes: {
        floatMockup: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-8px) rotate(0.15deg)' },
        },
      },
    },
  },
  plugins: [],
}