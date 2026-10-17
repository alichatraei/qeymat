import type { Config } from "tailwindcss";

/**
 * توکن‌های رنگ و تایپوگرافی.
 * مقادیر روشن همان پروتوتایپ تأییدشده‌اند؛ مقادیر تیره در globals.css.
 */
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // همه‌ی رنگ‌ها از متغیرهای CSS می‌آیند تا حالت روشن و تیره فقط با
      // عوض شدن مقادیر در globals.css کار کند (کلاس .dark روی <html>).
      colors: {
        ink: token("ink"),
        sub: token("sub"),
        muted: token("muted"),
        faint: token("faint"),
        line: { DEFAULT: token("line"), strong: token("line-strong") },
        surface: token("surface"),
        soft: token("soft"),
        field: token("field"),
        tab: token("tab"),
        hover: token("hover"),
        page: token("page"),
        overlay: token("overlay"),
        brand: { DEFAULT: token("brand"), deep: token("brand-deep"), mint: token("brand-mint"), cream: token("brand-cream") },
        green: {
          DEFAULT: token("green"),
          dark: token("green-dark"),
          soft: token("green-soft"),
          dot: token("green-dot"),
        },
        danger: { DEFAULT: token("danger"), soft: token("danger-soft"), ink: token("danger-ink") },
        amber: {
          DEFAULT: token("amber"),
          soft: token("amber-soft"),
          ink: token("amber-ink"),
          line: token("amber-line"),
        },
        blue: token("blue"),
        purple: token("purple"),
        white: "#ffffff",
        // فاز ۲ — رنگ جهت قیمت، جدا از قرمزِ خطا (danger)
        price: {
          up: token("price-up"),
          down: token("price-down"),
          stale: token("price-stale"),
        },
        "down-soft": token("down-soft"),
        "icon-dot": token("icon-dot"),
        "focus-ring": token("focus-ring"),
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
        card: "0 20px 54px rgb(var(--shadow) / .075)",
        solid: "0 8px 18px rgb(var(--c-green) / .16)",
        drawer: "-24px 0 70px rgb(var(--shadow) / .2)",
        tip: "0 12px 34px rgb(var(--shadow) / .14)",
        glow: "0 0 0 1px rgb(var(--c-brand-mint) / .25), 0 18px 50px rgb(var(--c-brand) / .25)",
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
        "rise-in": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-dot": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(var(--c-green-dot) / .45)" },
          "50%": { boxShadow: "0 0 0 6px rgb(var(--c-green-dot) / 0)" },
        },
      },
      animation: {
        "drawer-in": "drawer-in 240ms cubic-bezier(.22,.8,.3,1)",
        "fade-in": "fade-in 180ms ease",
        "toast-in": "toast-in 220ms cubic-bezier(.22,.8,.3,1)",
        "rise-in": "rise-in 320ms cubic-bezier(.22,.8,.3,1) both",
        "pulse-dot": "pulse-dot 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
