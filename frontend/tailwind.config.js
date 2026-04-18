/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cabinet Grotesk', 'system-ui', 'sans-serif'],
        display: ['Clash Display', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        nova: {
          50: '#f0f0ff',
          100: '#e0e0fe',
          400: '#a78bfa',
          500: '#7c3aed',
          600: '#6d28d9',
          900: '#0d0a1a',
          950: '#080512',
        }
      }
    }
  },
  plugins: []
}
