export type AssetCategory = "CURRENCY" | "GOLD" | "CRYPTO";

export type RateView = {
  symbol: string;
  nameFa: string;
  nameEn: string;
  category: AssetCategory;
  countryCode: string | null;
  mark: string | null;
  unit: string;
  sourceLabel: string;
  buy: number;
  sell: number;
  changePercent: number;
  dayLow: number | null;
  dayHigh: number | null;
  globalPrice: number | null;
  fetchedAt: string;
};

export type MarketSnapshot = {
  updatedAt: string;
  assets: RateView[];
};

export type HistoryPoint = {
  at: string;
  label: string;
  value: number;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
};
