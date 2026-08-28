import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/modules/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}"
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            color: "rgba(245,245,245,0.8)",
            maxWidth: "none",
            a: {
              color: "#F0FF00",
              textDecoration: "underline",
              "&:hover": { opacity: 0.8 },
            },
            strong: { color: "#f5f5f5" },
            h2: {
              color: "#f5f5f5",
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: "0.03em",
              fontSize: "1.75rem",
              fontWeight: "400",
              marginTop: "2.5rem",
              marginBottom: "1rem",
            },
            h3: {
              color: "#f5f5f5",
              fontSize: "1.25rem",
              fontWeight: "600",
              marginTop: "2rem",
            },
            blockquote: {
              borderLeftColor: "#F0FF00",
              borderLeftWidth: "3px",
              color: "rgba(245,245,245,0.7)",
              fontStyle: "normal",
              paddingLeft: "1.25rem",
            },
            code: {
              color: "#F0FF00",
              backgroundColor: "rgba(44,44,46,0.72)",
              padding: "0.15rem 0.4rem",
              borderRadius: "2px",
              fontWeight: "400",
              fontSize: "0.875em",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            pre: {
              backgroundColor: "rgba(44,44,46,0.72)",
              border: "1px solid rgba(245,245,245,0.1)",
              borderRadius: "2px",
            },
            hr: { borderColor: "rgba(245,245,245,0.12)" },
            ul: { color: "rgba(245,245,245,0.8)" },
            ol: { color: "rgba(245,245,245,0.8)" },
            li: { marginTop: "0.4rem", marginBottom: "0.4rem" },
            "li::marker": { color: "#F0FF00" },
          },
        },
      },
    }
  },
  plugins: [require("@tailwindcss/typography")]
};

export default config;
