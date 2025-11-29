import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          estateflow: '#0066CC',
          pinexacto: '#00A859',
          truepoint: '#FF6B35',
        },
        industries: {
          real_estate: '#1E40AF',
          legal: '#7C3AED',
          insurance: '#059669',
          mortgage: '#DC2626',
          financial: '#F59E0B',
          contractor: '#8B5CF6',
        },
        // Legacy industry colors (keeping for backward compatibility if needed)
        plumber: {
          primary: '#0ea5e9', // Sky blue
          secondary: '#f59e0b', // Amber
        },
        hvac: {
          primary: '#dc2626', // Red
          secondary: '#0ea5e9', // Sky blue
        },
        landscaper: {
          primary: '#16a34a', // Green
          secondary: '#84cc16', // Lime
        },
        electrician: {
          primary: '#facc15', // Yellow
          secondary: '#1f2937', // Gray
        },
        roofer: {
          primary: '#7c3aed', // Violet
          secondary: '#dc2626', // Red
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config