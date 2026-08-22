/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens — resolved from CSS variables so a single token set
        // drives both light and dark themes (see index.css).
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
        },
        hair: 'rgb(var(--hair) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          bright: 'rgb(var(--primary-bright) / <alpha-value>)',
          soft: 'rgb(var(--primary) / 0.12)',
        },
        // Fixed warm-forward accent hues for category differentiation.
        // Mid-tones chosen to read well on both light and dark surfaces.
        coral: '#D9714E',
        amber: '#E0A44E',
        rose: '#D06A8A',
        teal: '#3F9E92',
        indigo: '#6C6FCF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl: '1.1rem',
        '2xl': '1.4rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: '0 6px 24px -12px rgba(60,40,20,0.18)',
        pop: '0 12px 40px -12px rgba(217,113,78,0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        shimmer: 'shimmer 1.5s infinite',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
