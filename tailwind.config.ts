import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:    '#005BAA',
          light:   '#0078D7',
          accent:  '#FF6B00',
          bg:      '#F0F7FF',
        },
        text: {
          primary:   '#1A1A2E',
          secondary: '#666666',
          muted:     '#999999',
        },
      },
      fontFamily: {
        sans:    ['var(--font-sans)', 'Be Vietnam Pro', 'Inter', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      keyframes: {
        'chat-pulse': {
          '0%, 100%': { boxShadow: '0 4px 16px rgba(0,91,170,.4)' },
          '50%':       { boxShadow: '0 4px 24px rgba(0,91,170,.7), 0 0 0 8px rgba(0,91,170,.1)' },
        },
      },
      animation: {
        'chat-pulse': 'chat-pulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
