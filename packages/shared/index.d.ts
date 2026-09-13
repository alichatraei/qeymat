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
export declare const CATEGORY_TABS: { id: string; label: string; plus?: boolean }[];
export declare const CATEGORY_SLUGS: Record<string, "CURRENCY" | "GOLD" | "CRYPTO" | "COMMODITY" | "STOCK" | "INDEX">;

export declare function getPlan(id: string): Plan | null;
export declare function fa(value: number | string | null | undefined): string;
export declare function parseNumber(value: string | number | null | undefined): number;
export declare function movement(change: number): string;
export declare function timeAgo(date: string | Date | null | undefined): string;
export declare function clock(date?: string | Date): string;
export declare function jalali(date?: string | Date): string;
export declare function tomanPrice(priceUsd: number, usdRate: number, feePercent?: number): number;

export type PlusPlan = {
  id: string;
  label: string;
  months: string;
  monthCount: number;
  price: number;
  note: string;
  popular?: boolean;
};

export declare const PLUS_PLANS: PlusPlan[];
export declare const PLUS_FEATURES: string[];
export declare function getPlusPlan(id: string): PlusPlan | null;
export declare function getAnyPlan(id: string): Plan | PlusPlan | null;
