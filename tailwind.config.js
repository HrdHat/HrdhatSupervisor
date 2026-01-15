/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // HrdHat Custom Color Palette - Dark Modern Theme
      colors: {
        // HrdHat Brand Colors (vintage-inspired)
        hrdhat: {
          'golden-brown': '#9e5e1a',
          'lemon-chiffon': '#faf7c0',
          'asparagus-green': '#7fb069',
          'old-gold': '#d1bd23',
          'old-gold-light': '#e4c94f',
          'chili-red': '#d94730',
          'chili-red-light': '#e58c7f',
        },
        
        // Primary brand colors (using HrdHat Old Gold)
        primary: {
          50: '#fdfcf3',
          100: '#faf7c0',
          200: '#f0ea8a',
          300: '#e4c94f',
          400: '#d1bd23',
          500: '#d1bd23',
          600: '#b19e1d',
          700: '#9e5e1a',
          800: '#7a4a15',
          900: '#5a3610',
          950: '#3a2309',
        },

        // Secondary/Gray palette
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },

        // Safety/Warning colors for construction context
        safety: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },

        // Success (safety compliance)
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        // Error/Danger
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },

        // Info
        info: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },

      // Custom typography
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        heading: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },

      // Custom border radius
      borderRadius: {
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },

      // Custom shadows
      boxShadow: {
        card: '0 4px 14px 0 rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};
