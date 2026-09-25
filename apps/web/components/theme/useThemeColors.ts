"use client";

import { useEffect, useState } from "react";
import { THEME_EVENT } from "./theme";

export type ThemeColors = {
  dark: boolean;
  green: string;
  danger: string;
  grid: string;
  tick: string;
  surface: string;
  ink: string;
  palette: string[];
};

const LIGHT: ThemeColors = {
  dark: false,
  green: "rgb(11 143 97)",
  danger: "rgb(238 93 97)",
  grid: "rgb(228 234 231)",
  tick: "rgb(138 148 157)",
  surface: "rgb(255 255 255)",
  ink: "rgb(7 19 31)",
  palette: ["rgb(11 143 97)", "rgb(57 117 198)", "rgb(216 148 34)", "rgb(122 92 198)"],
};

function read(): ThemeColors {
  if (typeof window === "undefined") return LIGHT;
  const style = getComputedStyle(document.documentElement);
  const v = (name: string) => `rgb(${style.getPropertyValue(`--c-${name}`).trim()})`;
  return {
    dark: document.documentElement.classList.contains("dark"),
    green: v("green"),
    danger: v("danger"),
    grid: v("line"),
    tick: v("faint"),
    surface: v("surface"),
    ink: v("ink"),
    palette: [v("green"), v("blue"), v("amber"), v("purple")],
  };
}

/** رنگ‌های نمودار از متغیرهای CSS؛ با عوض شدن تم دوباره خوانده می‌شوند */
export function useThemeColors() {
  const [colors, setColors] = useState<ThemeColors>(LIGHT);
  useEffect(() => {
    const update = () => setColors(read());
    update();
    window.addEventListener(THEME_EVENT, update);
    return () => window.removeEventListener(THEME_EVENT, update);
  }, []);
  return colors;
}
