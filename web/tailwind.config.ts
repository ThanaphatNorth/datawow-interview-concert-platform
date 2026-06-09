import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        brand: 'var(--brand)',
        success: 'var(--success)',
        danger: 'var(--danger)',
      },
      borderRadius: {
        input: '8px',
        card: '12px',
      },
      screens: {
        md: '768px',
        lg: '1024px',
      },
    },
  },
  plugins: [],
};

export default config;
