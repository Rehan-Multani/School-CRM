export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontSize: {
        '2xs': '0.6875rem',
        '3xs': '0.625rem',
        '4xs': '0.5625rem',
      },
      colors: {
        slate: {
          850: '#172033',
          750: '#253248',
          950: '#0B0F19',
          955: '#070B14',
          905: '#0F172A',
          805: '#1E293B',
          655: '#475569',
          550: '#64748B',
          450: '#94A3B8',
          350: '#CBD5E1',
          250: '#E2E8F0',
          202: '#E2E8F0',
        },
        indigo: {
          650: '#4338CA',
          955: '#1E1B4B',
        },
        violet: {
          605: '#7C3AED',
          650: '#6D28D9',
          955: '#2E1065',
        },
        cyan: {
          955: '#083344',
        },
        emerald: {
          955: '#064E3B',
        },
        border: "var(--border-color)",
        background: "var(--bg-color)",
        foreground: "var(--text-color)",
        card: "var(--card-bg)",
        "card-foreground": "var(--text-color)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          hover: "rgb(var(--primary-hover) / <alpha-value>)",
          light: "rgb(var(--primary-light) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "#06B6D4", // Cyan 500
          hover: "#0891B2",
        },
        accent: {
          DEFAULT: "#8B5CF6", // Violet 500
        },
        success: {
          DEFAULT: "#10B981", // Emerald 500
        },
        warning: {
          DEFAULT: "#F59E0B", // Amber 500
        },
        danger: {
          DEFAULT: "#F43F5E", // Rose 500
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        premium: "0 10px 30px -10px rgba(79, 70, 229, 0.1)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
      }
    },
  },
  plugins: [],
}
