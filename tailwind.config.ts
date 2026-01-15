import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: 'class',
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/views/**/*.{js,ts,jsx,tsx,mdx}', // Added views
        './src/layout/**/*.{js,ts,jsx,tsx,mdx}', // Added layout
    ],
    theme: {
        extend: {
            colors: {
                primary: '#136dec',
                'background-light': '#f6f7f8',
                'background-dark': '#101822',
                'surface-dark': '#1e293b',
                'surface-light': '#ffffff',
            },
            fontFamily: {
                display: ['Inter', 'Noto Sans JP', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
                sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
            },
            borderRadius: {
                lg: '0.5rem',
                xl: '0.75rem',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },
        },
    },
    plugins: [],
};
export default config;
