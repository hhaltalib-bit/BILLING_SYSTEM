import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark theme
        dark: {
          bg:   '#080b10',
          s1:   '#0d1117',
          s2:   '#131920',
          s3:   '#1a2332',
          s4:   '#1e2a3a',
        },
        // Light theme
        light: {
          bg:   '#eef1f5',
          s1:   '#f5f7fa',
          s2:   '#eaecf0',
          s3:   '#e2e5ea',
        },
        // Brand accent
        accent: {
          blue:   '#3b82f6',
          green:  '#10b981',
          purple: '#8b5cf6',
          amber:  '#f59e0b',
          red:    '#ef4444',
        },
        gold: '#f59e0b',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['Inter', 'Noto Sans Arabic', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
