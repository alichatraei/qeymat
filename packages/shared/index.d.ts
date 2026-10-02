export type PlanId = "monthly" | "quarterly" | "semiannual" | "annual";

export type Plan = {
  id: PlanId;
  label: string;
  months: string;
  monthCount: number;
  price: number;
  limit: number;
  requests: string;
  note: string;
  popular?: boolean;
};

export declare const PLANS: Plan[];
export declare const CATEGORY_TABS: { id: string; label: string }[];
export declare const CATEGORY_SLUGS: Record<string, "CURRENCY" | "GOLD" | "CRYPTO" | "COMMODITY" | "STOCK" | "INDEX">;

export declare function getPlan(id: string): Plan | null;
export declare function fa(value: number | string | null | undefined): string;
export declare function parseNumber(value: string | number | null | undefined): number;
export declare function movement(change: number): string;
export declare function timeAgo(date: string | Date | null | undefined): string;
export declare function clock(date?: string | Date): string;
export declare function jalali(date?: string | Date): string;
export declare function tomanPrice(priceUsd: number, usdRate: number, feePercent?: number): number;

export type PlusTierId = "plus" | "pro";

export type PlusPlan = {
  id: string;
  tier: PlusTierId;
  smsAlerts: number;
  label: string;
  months: string;
  monthCount: number;
  price: number;
  note: string;
  popular?: boolean;
};

export declare const PLUS_PLANS: PlusPlan[];
export declare const PLUS_TIERS: { id: PlusTierId; label: string; smsAlerts: number; note: string }[];
export declare function smsAlertLimit(planId: string | null | undefined): number;

export type ChartRangeId = "1d" | "1w" | "1m" | "3m" | "1y" | "3y" | "5y" | "10y";
export type ChartInterval = "raw" | "day" | "month" | "year";
export declare const CHART_RANGES: { id: ChartRangeId; label: string; days: number; interval: ChartInterval }[];
export declare const CHART_INTERVALS: { id: Exclude<ChartInterval, "raw">; label: string }[];
export declare const MAX_HISTORY_YEARS: number;
export declare const DOLLAR_SYMBOLS: string[];
export declare const RATE_FAMILIES: string[][];
export declare function relatedSymbols(symbol: string, assets: { symbol: string; category: string }[], limit?: number): string[];
export declare function unitLabel(unit: string | null | undefined): string;
export declare const PLUS_FEATURES: string[];
export declare function getPlusPlan(id: string): PlusPlan | null;
export declare function getAnyPlan(id: string): Plan | PlusPlan | null;
