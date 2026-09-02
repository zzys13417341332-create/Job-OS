import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F6F6F8",
        surface: "#FFFFFF",
        line: "#E6E6EC",
        lineStrong: "#D4D4DE",
        ink: "#191922",
        inkSoft: "#41414E",
        muted: "#6E6E7C",
        faint: "#9B9BA6",
        violet: {
          DEFAULT: "#6D5AE0",
          soft: "#F0EDFB",
          line: "#DDD6F5",
          deep: "#5441C0"
        },
        blue: {
          DEFAULT: "#3E74E8",
          soft: "#ECF2FD",
          line: "#D6E3FA",
          deep: "#2D5CC4"
        },
        green: {
          DEFAULT: "#279A6B",
          soft: "#E7F5EE",
          line: "#C9E9D9",
          deep: "#1C7A53"
        },
        amber: {
          DEFAULT: "#B87816",
          soft: "#FCF3E2",
          line: "#F0DFBC"
        },
        red: {
          DEFAULT: "#CE4641",
          soft: "#FCEDEC",
          line: "#F2D3D1"
        }
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Inter",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "Segoe UI",
          "sans-serif"
        ],
        mono: [
          "SF Mono",
          "SFMono-Regular",
          "ui-monospace",
          "Menlo",
          "Consolas",
          "monospace"
        ]
      },
      boxShadow: {
        float: "0 12px 32px -16px rgba(25, 25, 34, 0.22)",
        pop: "0 20px 50px -20px rgba(25, 25, 34, 0.28)"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(3px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" }
        }
      },
      animation: {
        "fade-in": "fade-in .18s ease-out",
        "slide-in": "slide-in .18s ease-out"
      }
    }
  },
  plugins: []
};

export default config;
