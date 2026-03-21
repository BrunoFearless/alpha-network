import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          light:   '#E8C97A',
          dim:     'rgba(201,168,76,0.15)',
          dark:    '#8B6914',
        },
        alpha: {
          bg:      '#07080D',
          surface: '#0F1019',
          card:    '#141620',
          border:  'rgba(180,160,255,0.12)',
        },
        text: {
          primary:   '#E8E0F0',
          secondary: '#9890B8',
          muted:     '#504870',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body:    ['Crimson Pro', 'serif'],
        sans:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
