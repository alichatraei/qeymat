"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fa } from "@qeymat/shared";
import { useThemeColors } from "@/components/theme/useThemeColors";
import type { HistoryPoint } from "@/lib/types";

const tooltipStyle = (surface: string, ink: string) => ({
  border: 0,
  borderRadius: 13,
  background: surface,
  color: ink,
  boxShadow: "0 12px 34px rgba(0,0,0,.18)",
  fontFamily: "var(--font-vazirmatn), Vazirmatn, Tahoma, sans-serif",
  fontSize: 12,
  direction: "rtl" as const,
});

/** عدد کوچک (مثل انس یا بیت‌کوین به دلار) اعشار لازم دارد */
function price(value: number) {
  if (Math.abs(value) >= 1000) return fa(Math.round(value));
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(value);
}

function compact(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(value / 1e9)} میلیارد`;
  if (abs >= 1e7) return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value / 1e6)} میلیون`;
  return price(value);
}

/**
 * نمودار قیمت یک دارایی. رنگ از جهت تغییر بازه می‌آید:
 * سبز وقتی نقطه‌ی آخر بالاتر از نقطه‌ی اول است، قرمز در غیر این صورت.
 */
export default function PriceChart({
  data,
  height = 260,
  unit = "تومان",
  compactAxis = false,
}: {
  data: HistoryPoint[];
  height?: number;
  unit?: string;
  compactAxis?: boolean;
}) {
  const colors = useThemeColors();

  if (!data.length) {
    return (
      <div
        className="mt-5 grid place-items-center rounded-2xl border border-dashed border-line text-[11.5px] text-muted"
        style={{ height }}
      >
        هنوز تاریخچه‌ای برای این بازه ثبت نشده است.
      </div>
    );
  }

  const positive = data[data.length - 1].value >= data[0].value;
  const color = positive ? colors.green : colors.danger;

  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || max * 0.02) * 0.18;
  const gradientId = `fill-${positive ? "up" : "down"}`;

  return (
    <div className="chart-lt mt-5 w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity={0.22} />
              <stop offset="1" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.tick, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            orientation="right"
            domain={[Math.max(0, min - pad), max + pad]}
            tick={{ fill: colors.tick, fontSize: 11 }}
            tickFormatter={(value) => (compactAxis ? compact(value) : price(value))}
            tickLine={false}
            axisLine={false}
            width={compactAxis ? 84 : 72}
          />
          <Tooltip
            formatter={(value) => [`${price(Number(value))} ${unit}`, "قیمت"]}
            labelFormatter={(label) => String(label)}
            contentStyle={tooltipStyle(colors.surface, colors.ink)}
            cursor={{ stroke: colors.tick, strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.6}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 5, fill: color, stroke: colors.surface, strokeWidth: 3 }}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type CompareSeries = {
  symbol: string;
  nameFa: string;
  unit: string;
  points: HistoryPoint[];
};

/**
 * مقایسه‌ی چند دارایی روی یک محور زمانی.
 * در حالت «درصدی» هر سری از ابتدای بازه نرمال می‌شود تا دارایی‌هایی با
 * قیمت‌های بسیار متفاوت (دلار و سکه) قابل مقایسه باشند.
 */
export function CompareChart({
  series,
  mode = "percent",
  height = 360,
}: {
  series: CompareSeries[];
  mode?: "percent" | "absolute";
  height?: number;
}) {
  const colors = useThemeColors();

  const rows = useMemo(() => {
    const byKey = new Map<string, Record<string, number | string>>();
    const order: string[] = [];
    for (const item of series) {
      const base = item.points[0]?.value || 1;
      for (const point of item.points) {
        const key = point.at.slice(0, 10);
        let row = byKey.get(key);
        if (!row) {
          row = { key, label: point.label };
          byKey.set(key, row);
          order.push(key);
        }
        row[item.symbol] = mode === "percent" ? ((point.value - base) / base) * 100 : point.value;
      }
    }
    return order.sort().map((key) => byKey.get(key)!);
  }, [series, mode]);

  if (!rows.length) {
    return (
      <div
        className="mt-5 grid place-items-center rounded-2xl border border-dashed border-line text-[11.5px] text-muted"
        style={{ height }}
      >
        برای این بازه داده‌ای نیست.
      </div>
    );
  }

  return (
    <div className="chart-lt mt-5 w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.tick, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            orientation="right"
            tick={{ fill: colors.tick, fontSize: 11 }}
            tickFormatter={(value) =>
              mode === "percent" ? `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(value)}٪` : compact(value)
            }
            tickLine={false}
            axisLine={false}
            width={mode === "percent" ? 56 : 84}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(value, key) => {
              const item = series.find((s) => s.symbol === key);
              const number = Number(value);
              return [
                mode === "percent"
                  ? `${number >= 0 ? "+" : "−"}٪${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(Math.abs(number))}`
                  : `${price(number)} ${item?.unit === "USD" ? "دلار" : "تومان"}`,
                item?.nameFa ?? String(key),
              ];
            }}
            labelFormatter={(label) => String(label)}
            contentStyle={tooltipStyle(colors.surface, colors.ink)}
            cursor={{ stroke: colors.tick, strokeDasharray: "3 3" }}
          />
          {series.map((item, index) => (
            <Line
              key={item.symbol}
              type="monotone"
              dataKey={item.symbol}
              stroke={colors.palette[index % colors.palette.length]}
              strokeWidth={2.4}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export { price as formatPrice };
