/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Blu istituzionale
        brand: {
          50: '#eef3ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#608ffa',
          500: '#3b6bf5',
          600: '#2451e6',
          700: '#1e40c8',
          800: '#1f3aa0',
          900: '#1f377e',
          950: '#16224d',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        'card-hover':
          '0 10px 30px -12px rgb(16 24 40 / 0.20), 0 2px 6px -2px rgb(16 24 40 / 0.08)',
        dialog: '0 24px 60px -15px rgb(16 24 40 / 0.40)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'scale-in': 'scale-in 0.16s ease-out',
      },
    },
  },
  plugins: [],
};
