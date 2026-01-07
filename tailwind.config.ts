import typography from "@tailwindcss/typography";
import animate from "tailwindcss-animate";
import { type Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        serif: ["'Playfair Display'", "serif"],
        sans: ["'Inter'", "sans-serif"],
      },
      colors: {
        background: "#F9F7F4", // Cream background
        foreground: "#1A1A1A", // Near black text
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1A1A",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1A1A",
        },
        primary: {
          DEFAULT: "#2B5740", // Dark Forest Green
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#8B4367", // Plum accent
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#E8F5E9", // Pale Mint
          foreground: "#2B5740",
        },
        accent: {
          DEFAULT: "#E8F5E9", // Pale Mint
          foreground: "#2B5740",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "#E2E8F0",
        input: "#E2E8F0",
        ring: "#2B5740",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate, typography],
} satisfies Config;
