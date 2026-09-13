export type AssetCategory = "CURRENCY" | "GOLD" | "CRYPTO" | "COMMODITY" | "STOCK" | "INDEX";

export type AssetTier = "FREE" | "PLUS";

export type RateView = {
  symbol: string;
  nameFa: string;
  nameEn: string;
  category: AssetCategory;
  tier: AssetTier;
  /// وقتی true است، قیمت‌ها پنهان شده‌اند و کاربر باید قیمت پلاس بخرد
  locked?: boolean;
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
