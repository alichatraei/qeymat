import type { Config } from "tailwindcss";

/**
 * توکن‌های رنگ و تایپوگرافی عیناً از پروتوتایپ تأییدشده برداشته شده‌اند.
 * هیچ رنگ تازه‌ای اضافه نشده تا ظاهر نهایی با نمونه یکی باشد.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07131f",
        muted: "#748089",
        line: "#e4eae7",
        surface: "#ffffff",
        soft: "#f4f7f5",
        page: "#fafcfb",
        green: {
          DEFAULT: "#0b8f61",
          dark: "#08764f",
          soft: "#e7f5ee",
          dot: "#17b979",
        },
        danger: "#ee5d61",
        amber: "#d89422",
        blue: "#3975c6",
        purple: "#7a5cc6",
      },
      fontFamily: {
        sans: ["var(--font-vazirmatn)", "Vazirmatn", "Tahoma", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["9.5px", "1.2"],
        xxs: ["10.5px", "1.3"],
      },
      borderRadius: {
        card: "19px",
        control: "11px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 20px 54px rgba(18,61,45,.075)",
        solid: "0 8px 18px rgba(11,143,97,.13)",
        drawer: "-24px 0 70px rgba(8,32,23,.16)",
        tip: "0 12px 34px rgba(7,30,22,.12)",
      },
      maxWidth: {
        content: "1180px",
        header: "1240px",
      },
      keyframes: {
        "drawer-in": {
          from: { transform: "translateX(-24px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "toast-in": {
          from: { transform: "translateY(14px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "drawer-in": "drawer-in 240ms cubic-bezier(.22,.8,.3,1)",
        "fade-in": "fade-in 180ms ease",
        "toast-in": "toast-in 220ms cubic-bezier(.22,.8,.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;
