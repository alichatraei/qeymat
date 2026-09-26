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
import { niceScale, timeTicks, tooltipLabel, type Granularity } from "@/lib/chart-scale";
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
 *
 * محور افقی زمان واقعی است (نه دسته‌ای)، پس روزهای تعطیل فاصله‌ی درست
 * می‌گیرند و برچسب‌ها روی مرز روز/ماه/سال شمسی می‌نشینند. محور قیمت گام
 * یکسان و گرد دارد.
 */
export default function PriceChart({
  data,
  height = 260,
  unit = "تومان",
  compactAxis = false,
  interval = "day",
}: {
  data: HistoryPoint[];
  height?: number;
  unit?: string;
  compactAxis?: boolean;
  interval?: Granularity;
}) {
  const colors = useThemeColors();

  const rows = useMemo(
    () => data.map((point) => ({ t: Date.parse(point.at), value: point.value })),
    [data],
  );
  const x = useMemo(() => timeTicks(rows.map((row) => row.t)), [rows]);
  const y = useMemo(() => {
    const values = rows.map((row) => row.value);
    return niceScale(Math.min(...values), Math.max(...values));
  }, [rows]);

  if (!rows.length) {
    return (
      <div
        className="mt-5 grid place-items-center rounded-2xl border border-dashed border-line text-[11.5px] text-muted"
        style={{ height }}
      >
        هنوز تاریخچه‌ای برای این بازه ثبت نشده است.
      </div>
    );
  }

  const positive = rows[rows.length - 1].value >= rows[0].value;
  const color = positive ? colors.green : colors.danger;
  const gradientId = `fill-${positive ? "up" : "down"}`;

  return (
    <div className="chart-lt mt-5 w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 12, right: 4, left: 12, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity={0.22} />
              <stop offset="1" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[rows[0].t, rows[rows.length - 1].t]}
            ticks={x.ticks}
            interval={0}
            tickFormatter={x.format}
            tick={{ fill: colors.tick, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            padding={{ left: 6, right: 6 }}
          />
          <YAxis
            orientation="right"
            domain={y.domain}
            ticks={y.ticks}
            interval={0}
            tick={{ fill: colors.tick, fontSize: 11 }}
            tickFormatter={(value) => (compactAxis ? compact(value) : price(value))}
            tickLine={false}
            axisLine={false}
            width={compactAxis ? 84 : 72}
          />
          <Tooltip
            formatter={(value) => [`${price(Number(value))} ${unit}`, "قیمت"]}
            labelFormatter={(time) => tooltipLabel(Number(time), interval)}
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
  interval = "day",
}: {
  series: CompareSeries[];
  mode?: "percent" | "absolute";
  height?: number;
  interval?: Granularity;
}) {
  const colors = useThemeColors();

  const rows = useMemo(() => {
    const byKey = new Map<string, Record<string, number>>();
    for (const item of series) {
      const base = item.points[0]?.value || 1;
      for (const point of item.points) {
        const key = interval === "raw" ? point.at : point.at.slice(0, 10);
        let row = byKey.get(key);
        if (!row) {
          row = { t: Date.parse(point.at) };
          byKey.set(key, row);
        }
        row[item.symbol] = mode === "percent" ? ((point.value - base) / base) * 100 : point.value;
      }
    }
    return [...byKey.values()].sort((a, b) => a.t - b.t);
  }, [series, mode, interval]);

  const x = useMemo(() => timeTicks(rows.map((row) => row.t)), [rows]);
  const y = useMemo(() => {
    const values = rows.flatMap((row) =>
      Object.entries(row)
        .filter(([key]) => key !== "t")
        .map(([, value]) => value),
    );
    return niceScale(Math.min(...values), Math.max(...values));
  }, [rows]);

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
            dataKey="t"
            type="number"
            scale="time"
            domain={[rows[0].t, rows[rows.length - 1].t]}
            ticks={x.ticks}
            interval={0}
            tickFormatter={x.format}
            tick={{ fill: colors.tick, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            padding={{ left: 6, right: 6 }}
          />
          <YAxis
            orientation="right"
            domain={y.domain}
            ticks={y.ticks}
            interval={0}
            tick={{ fill: colors.tick, fontSize: 11 }}
            tickFormatter={(value) =>
              mode === "percent" ? `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(value)}٪` : compact(value)
            }
            tickLine={false}
            axisLine={false}
            width={mode === "percent" ? 56 : 84}
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
            labelFormatter={(time) => tooltipLabel(Number(time), interval)}
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
