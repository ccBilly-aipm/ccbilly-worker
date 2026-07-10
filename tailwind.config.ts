import type { Config } from "tailwindcss";

/**
 * Deep-Space Glassmorphism design tokens (spec §7).
 * Colors are exposed as CSS variables (see globals.css) so light/dark themes
 * can swap them without recompiling. Brand + semantic colors are fixed hex.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens (resolved from CSS variables per theme)
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--fg-muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        // Brand gradient stops
        brand: {
          cyan: "#22D3EE",
          indigo: "#818CF8",
          violet: "#C084FC",
        },
        // Semantic
        success: "#34D399",
        warning: "#FBBF24",
        danger: "#FB7185",
        info: "#60A5FA",
      },
      fontFamily: {
        display: ["var(--font-display)", "Space Grotesk", "sans-serif"],
        sans: [
          "var(--font-sans)",
          "Inter",
          "PingFang SC",
          "Noto Sans SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        glass: "18px",
        "glass-lg": "20px",
        "glass-sm": "14px",
      },
      backdropBlur: {
        glass: "24px",
        "glass-light": "20px",
      },
      boxShadow: {
        glass: "0 8px 40px rgba(2,6,23,0.5)",
        "glass-light": "0 8px 30px rgba(15,23,42,0.08)",
        glow: "0 0 24px rgba(34,211,238,0.15)",
      },
      backgroundImage: {
        brand: "linear-gradient(135deg, #22D3EE 0%, #818CF8 50%, #C084FC 100%)",
        "brand-light":
          "linear-gradient(135deg, #0891B2 0%, #6D28D9 100%)",
      },
      transitionTimingFunction: {
        space: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "aurora-drift": {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(6%,-4%) scale(1.08)" },
        },
        "orbit-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "aurora-drift": "aurora-drift 40s ease-in-out infinite",
        "orbit-spin": "orbit-spin 120s linear infinite",
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
