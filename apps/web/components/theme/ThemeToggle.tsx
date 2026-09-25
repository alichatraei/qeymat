"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { THEME_EVENT, THEME_KEY } from "./theme";

export function applyTheme(dark: boolean, persist = true) {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      /* حالت خصوصی مرورگر */
    }
  }
  window.dispatchEvent(new Event(THEME_EVENT));
  window.setTimeout(() => root.classList.remove("theme-transition"), 260);
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));

    // اگر کاربر خودش انتخاب نکرده، با تنظیم سیستم همراه می‌شویم
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(THEME_KEY);
      } catch {
        /* نادیده */
      }
      if (saved) return;
      applyTheme(event.matches, false);
      setDark(event.matches);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(!dark);
        setDark(!dark);
      }}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-control border border-line bg-surface text-sub transition-colors hover:text-ink ${className}`}
      aria-label={dark ? "حالت روشن" : "حالت تیره"}
      title={dark ? "حالت روشن" : "حالت تیره"}
    >
      {dark ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
    </button>
  );
}
