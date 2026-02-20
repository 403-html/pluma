/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // ─── Design-token colours ──────────────────────────────────────────
      // Change a value here and it propagates everywhere automatically.
      colors: {
        // Surface hierarchy
        surface:  '#0A2342',          // page / main background
        card:     '#112E52',          // elevated panels, sidebar, forms
        stroke:   '#1D3D6A',          // all borders
        // Accent
        accent:   '#00C2A8',          // CTAs, active nav, focus rings
        // Text hierarchy
        ink:      '#E8EDF2',          // primary text
        'ink-muted': '#8A99AB',       // secondary / placeholder text
        'ink-dim':   '#6B7A8D',       // inactive / disabled
      },
      // ─── Design-token font sizes ───────────────────────────────────────
      fontSize: {
        // label: caps headers inside controls (PROJECT / ENVIRONMENT)
        label: ['13px', { lineHeight: '1.4', letterSpacing: '0.05em' }],
        // ui: default interactive element size (nav, buttons, inputs)
        ui:    ['15px', { lineHeight: '1.5' }],
      },
    },
  },
  plugins: [],
};
