/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Semantic status tokens (from CSS variables) */
        "status-critical": "rgb(var(--color-status-critical) / <alpha-value>)",
        "status-warning": "rgb(var(--color-status-warning) / <alpha-value>)",
        "status-ok": "rgb(var(--color-status-ok) / <alpha-value>)",
        "status-info": "rgb(var(--color-status-info) / <alpha-value>)",
        /* KPI tokens */
        "kpi-leakage": "rgb(var(--color-kpi-leakage) / <alpha-value>)",
        "kpi-credits": "rgb(var(--color-kpi-credits) / <alpha-value>)",
        "kpi-batches": "rgb(var(--color-kpi-batches) / <alpha-value>)",
        "kpi-forecast": "rgb(var(--color-kpi-forecast) / <alpha-value>)",
        /* Warm neutral semantic tokens */
        "bg": "var(--color-bg)",
        "bg-elevated": "var(--color-bg-elevated)",
        "fg": "var(--color-fg)",
        "brand": "var(--color-brand)",
        "brand-soft": "var(--color-brand-soft)",
        "critical": "var(--color-critical)",
        "warning": "var(--color-warning)",
        "ok": "var(--color-ok)",
        "info": "var(--color-info)",
        "muted-fg": "var(--color-muted-fg)",
        "border": "var(--color-border)",
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "sm": "0.25rem",
        "md": "0.5rem",
        "lg": "0.75rem",
        "xl": "1rem",
        "full": "9999px",
      },
      spacing: {
        "xs": "4px",
        "lg": "24px",
        "base": "4px",
        "md": "16px",
        "margin": "24px",
        "gutter": "16px",
        "xl": "32px",
        "sm": "8px",
        "tier-gap": "32px",
        "margin-mobile": "16px",
        "margin-desktop": "48px",
        "unit": "4px"
      },
      fontFamily: {
        "heading": ["Rubik", "sans-serif"],
        "body": ["Nunito Sans", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "label-md": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600" }],
        "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "headline-sm": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
        "body-sm": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
        "headline-lg-mobile": ["28px", { "lineHeight": "36px", "fontWeight": "600" }],
        "display-lg": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "tabular-nums": ["14px", { "lineHeight": "20px", "fontWeight": "500" }],
        "pricing-number": ["40px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
        "currency-symbol": ["24px", { "lineHeight": "32px", "fontWeight": "500" }],
        "headline-xl": ["32px", { "lineHeight": "40px", "fontWeight": "600" }],
        "label-caps": ["12px", { "lineHeight": "16px", "fontWeight": "600" }]
      }
    },
  },
  plugins: [],
}