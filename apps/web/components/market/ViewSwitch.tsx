"use client";

import type { MarketLayout } from "./AssetCell";

const OPTIONS: { id: MarketLayout; label: string; icon: React.ReactNode }[] = [
  {
    id: "square",
    label: "نمای کارتی",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="4" width="16" height="7" rx="2" />
        <rect x="4" y="13.5" width="7" height="6.5" rx="1.6" />
        <rect x="13" y="13.5" width="7" height="6.5" rx="1.6" />
      </svg>
    ),
  },
  {
    id: "circle",
    label: "نمای دایره‌ای",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="7.5" r="4" />
        <circle cx="7" cy="17" r="3.2" />
        <circle cx="17" cy="17" r="3.2" />
      </svg>
    ),
  },
  {
    id: "dial",
    label: "نمای سنجه",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M15.9 19.4A8.5 8.5 0 1 1 19.4 15.9" />
        <path d="M12 12 16 7" />
        <rect x="17.6" y="17.6" width="3.2" height="3.2" rx=".7" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

/** سوییچ سه‌حالتهٔ نما با thumb لغزان؛ انتخاب کاربر ذخیره می‌شود */
export default function ViewSwitch({
  value,
  onChange,
}: {
  value: MarketLayout;
  onChange: (layout: MarketLayout) => void;
}) {
  const index = OPTIONS.findIndex((option) => option.id === value);
  return (
    <div className="relative inline-flex gap-0.5 rounded-control border border-line bg-soft p-[3px]" role="group" aria-label="نمای صفحه">
      <span
        aria-hidden="true"
        className="absolute bottom-[3px] top-[3px] w-[34px] rounded-[8px] bg-surface shadow-[0_1px_3px_rgb(var(--shadow)/.1)] transition-[inset-inline-start] duration-[280ms] ease-[cubic-bezier(.16,1,.3,1)]"
        style={{ insetInlineStart: 3 + index * 36 }}
      />
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          aria-label={option.label}
          onClick={() => onChange(option.id)}
          className={`relative z-[1] grid h-9 w-[34px] place-items-center rounded-[8px] transition-colors duration-150 ${
            value === option.id ? "text-ink" : "text-sub hover:text-ink"
          }`}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
