export type AssetCategory = "CURRENCY" | "GOLD" | "CRYPTO" | "COMMODITY" | "STOCK" | "INDEX";

export type AssetTier = "FREE" | "PLUS";

export type RateView = {
  symbol: string;
  nameFa: string;
  nameEn: string;
  category: AssetCategory;
  tier: AssetTier;
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
  /// اطمینان موتور تحلیل به این نرخ (۰ تا ۱)
  confidence?: number;
  /// تعداد منابعی که در نرخ نهایی شرکت کرده‌اند
  sourceCount?: number;
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
  open?: number;
  high?: number;
  low?: number;
};

export type HistorySeries = {
  symbol: string;
  nameFa: string;
  unit: string;
  range: string;
  interval: "raw" | "day" | "month" | "year";
  /// اولین روزی که تاریخچه‌ی این دارایی از آن موجود است
  firstDay: string | null;
  /// چند سال تاریخچه موجود است (حداکثر ۱۰)
  yearsAvailable: number;
  points: HistoryPoint[];
};

export type PlusStatus = {
  active: boolean;
  plan: string | null;
  tier: "plus" | "pro" | null;
  smsLimit: number;
  expiresAt: string | null;
};

export type SessionUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: "USER" | "ADMIN";
};

export type TicketStatus = "OPEN" | "ANSWERED" | "CLOSED";

export type TicketView = {
  id: string;
  subject: string;
  category: string;
  priority: "LOW" | "NORMAL" | "HIGH";
  status: TicketStatus;
  lastReplyAt: string;
  createdAt: string;
  messageCount?: number;
};
