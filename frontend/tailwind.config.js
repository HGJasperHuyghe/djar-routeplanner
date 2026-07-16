/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core DJAR "Kinetic Vitality" brand tokens
        'deep-teal': '#004244',
        'deep-teal-container': '#005B5E',
        'kinetic-orange': '#E6855B',
        'soft-shell': '#F7F3F2',
        'pure-white': '#FFFFFF',

        // Full Material-style token set from DESIGN.md front matter
        surface: '#f9f9f9',
        'surface-dim': '#dadada',
        'surface-bright': '#f9f9f9',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f3f3',
        'surface-container': '#eeeeee',
        'surface-container-high': '#e8e8e8',
        'surface-container-highest': '#e2e2e2',
        'on-surface': '#1b1b1b',
        'on-surface-variant': '#3f4949',
        'inverse-surface': '#303030',
        'inverse-on-surface': '#f1f1f1',
        outline: '#6f7979',
        'outline-variant': '#bec8c8',
        'surface-tint': '#1b686b',

        primary: {
          DEFAULT: '#004244',
          container: '#005b5e',
        },
        'on-primary': '#ffffff',
        'on-primary-container': '#8bd0d3',
        'inverse-primary': '#8dd2d5',

        secondary: {
          DEFAULT: '#974723',
          container: '#ff996d',
        },
        'on-secondary': '#ffffff',
        'on-secondary-container': '#772f0b',

        tertiary: {
          DEFAULT: '#3b3a3a',
          container: '#525150',
        },
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#c7c4c3',

        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': '#ffffff',
        'on-error-container': '#93000a',

        'primary-fixed': '#a8eff2',
        'primary-fixed-dim': '#8dd2d5',
        'on-primary-fixed': '#002021',
        'on-primary-fixed-variant': '#004f52',
        'secondary-fixed': '#ffdbcd',
        'secondary-fixed-dim': '#ffb597',
        'on-secondary-fixed': '#360f00',
        'on-secondary-fixed-variant': '#79310d',
        'tertiary-fixed': '#e5e2e1',
        'tertiary-fixed-dim': '#c9c6c5',
        'on-tertiary-fixed': '#1c1b1b',
        'on-tertiary-fixed-variant': '#484646',

        background: '#f9f9f9',
        'on-background': '#1b1b1b',
        'surface-variant': '#e2e2e2',
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body: ['"Be Vietnam Pro"', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['64px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg-mobile': ['40px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '1.3', fontWeight: '700' }],
        'headline-lg-mobile': ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '1', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      spacing: {
        base: '8px',
        gutter: '24px',
        'margin-mobile': '20px',
        'margin-desktop': '64px',
      },
      maxWidth: {
        content: '1280px',
      },
      boxShadow: {
        card: '0 2px 12px 0 rgb(0 66 68 / 0.06)',
        overlay: '0 4px 24px 0 rgb(0 66 68 / 0.10)',
      },
      backdropBlur: {
        overlay: '12px',
      },
    },
  },
  plugins: [],
};
