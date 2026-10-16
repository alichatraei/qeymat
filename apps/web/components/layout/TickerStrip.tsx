"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { timeAgo } from "@qeymat/shared";
import AssetIcon from "@/components/market/AssetIcon";
import { DIR_ARROW, DIR_CLASS, directionOf, marketChange, marketPrice } from "@/components/market/marketFormat";
import type { MarketSnapshot } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

/** ۹ داراییِ ثابت نوار قیمت، به ترتیب دیزاین */
const TICKER_SYMBOLS = ["USD", "USDT", "GOLD18", "EMAMI", "EUR", "AED", "BTC", "ABSHODEH", "BRENT"];

/**
 * نوار قیمت‌های کلیدی زیر هدر (فاز ۲). در صفحهٔ بازار نمایش داده نمی‌شود،
 * چون همان اطلاعات را دارد و تکرار شلوغی می‌سازد.
 */
export default function TickerStrip({ initialSnapshot }: { initialSnapshot: MarketSnapshot | null }) {
  const pathname = usePathname();
  const onMarket = pathname === "/";
  const { data } = useSWR<MarketSnapshot>(onMarket ? null : "/api/public/rates", fetcher, {
    fallbackData: initialSnapshot ?? undefined,
    refreshInterval: 60000,
  });
  if (onMarket) return null;
  const snapshot = data ?? initialSnapshot;
  if (!snapshot?.assets?.length) return null;

  const bySymbol = new Map(snapshot.assets.map((asset) => [asset.symbol, asset]));
  const items = TICKER_SYMBOLS.map((symbol) => bySymbol.get(symbol)).filter(Boolean) as MarketSnapshot["assets"];
  if (!items.length) return null;

  return (
    <div className="border-b border-line bg-soft">
      <div className="mx-auto flex h-10 w-[min(1240px,calc(100%-32px))] items-center gap-4 md:w-[min(1240px,calc(100%-48px))]">
        <span className="hidden shrink-0 border-l border-line-strong pl-3 text-[11px] text-muted sm:block">به تومان</span>
        <ul
          aria-label="قیمت‌های کلیدی"
          className="flex min-w-0 flex-1 snap-x items-center gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const direction = directionOf(item.changePercent);
            return (
              <li key={item.symbol} className="snap-start">
                <Link
                  href={`/?symbol=${item.symbol}`}
                  className="flex min-h-10 items-center gap-2 whitespace-nowrap no-underline"
                  aria-label={`${item.nameFa} ${marketPrice(item.sell, item.unit)} ${marketChange(item.changePercent)}`}
                >
                  <AssetIcon rate={item} size={24} />
                  <span className="text-[11.5px] text-sub">{item.nameFa}</span>
                  <span className={`tabular text-[13px] font-bold ${DIR_CLASS[direction]}`}>
                    {marketPrice(item.sell, item.unit)}
                  </span>
                  <span className={`tabular text-[11px] ${DIR_CLASS[direction]}`}>
                    {DIR_ARROW[direction]} {marketChange(item.changePercent)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <span className="hidden shrink-0 items-center gap-1.5 text-[11px] font-medium text-sub md:inline-flex" suppressHydrationWarning>
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-green-dot" aria-hidden="true" />
          زنده · {timeAgo(snapshot.updatedAt)}
        </span>
      </div>
    </div>
  );
}
