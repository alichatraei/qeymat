"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fa } from "@qeymat/shared";
import type { HistoryPoint } from "@/lib/types";

/**
 * نمودار قیمت. رنگ خط از جهت تغییر بازه می‌آید:
 * سبز وقتی نقطه‌ی آخر بالاتر از نقطه‌ی اول است، قرمز در غیر این صورت.
 */
export default function PriceChart({
  data,
  height = 260,
}: {
  data: HistoryPoint[];
  height?: number;
}) {
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
  const color = positive ? "#0b8f61" : "#ef5f61";

  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || max * 0.02) * 0.18;

  return (
    <div className="chart-lt mt-5 w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#e9eeec" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8a949d", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            orientation="right"
            domain={[Math.max(0, min - pad), max + pad]}
            tick={{ fill: "#8a949d", fontSize: 11 }}
            tickFormatter={(value) => fa(value)}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            formatter={(value) => [`${fa(Number(value))} تومان`, "قیمت"]}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              border: 0,
              borderRadius: 13,
              boxShadow: "0 12px 34px rgba(7,30,22,.12)",
              fontFamily: "var(--font-vazirmatn), Vazirmatn, Tahoma, sans-serif",
              fontSize: 12,
              direction: "rtl",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            fill={color}
            fillOpacity={0.07}
            activeDot={{ r: 5, fill: color, stroke: "#fff", strokeWidth: 3 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
