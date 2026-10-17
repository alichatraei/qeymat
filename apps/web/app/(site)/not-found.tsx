import Link from "next/link";
import AssetIcon from "@/components/market/AssetIcon";
import { DIR_ARROW, DIR_CLASS, directionOf, marketChange, marketPrice } from "@/components/market/marketFormat";
import { getSnapshot } from "@/lib/market";

/**
 * ۴۰۴ فاز ۲: «۴ ▪ ۴» — جای صفر، نقطهٔ نعنایی برند می‌نشیند.
 * عدد را از کاربر نمی‌گیریم: چهار داراییِ پربازدید زنده پایین صفحه‌اند.
 */
export default async function NotFound() {
  const snapshot = await getSnapshot().catch(() => null);
  const popular = ["USD", "GOLD18", "EMAMI", "USDT"]
    .map((symbol) => snapshot?.assets.find((asset) => asset.symbol === symbol))
    .filter(Boolean) as NonNullable<typeof snapshot>["assets"];

  return (
    <main className="content-width flex flex-col items-center pb-24 pt-16 text-center">
      <div className="flex items-center gap-4 text-[88px] font-extrabold leading-none tracking-[-4px]" aria-hidden="true">
        ۴
        <span className="dot-pulse mt-3 inline-block h-6 w-6 rounded-[6px] bg-icon-dot" />
        ۴
      </div>
      <h1 className="mt-6 text-[22px] font-extrabold tracking-[-.5px]">این صفحه پیدا نشد</h1>
      <p className="mt-2 max-w-[44ch] text-[13px] leading-7 text-sub">
        شاید آدرس عوض شده باشد؛ قیمت‌ها اما سر جایشان هستند.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-[48px] items-center rounded-[10px] bg-brand px-6 text-[14px] font-bold text-brand-cream transition-transform active:scale-[.97] dark:bg-brand-mint dark:text-brand-deep"
      >
        بازار امروز
      </Link>

      {popular.length ? (
        <div className="mt-12 grid w-full max-w-[720px] grid-cols-2 gap-3 sm:grid-cols-4">
          {popular.map((asset) => {
            const direction = directionOf(asset.changePercent);
            return (
              <Link
                key={asset.symbol}
                href={`/${asset.symbol.toLowerCase()}`}
                className="card flex flex-col items-start gap-2 p-3.5 text-right no-underline transition-colors hover:border-line-strong"
              >
                <AssetIcon rate={asset} size={36} />
                <span className="truncate text-[12px] font-medium text-sub">{asset.nameFa}</span>
                <span className={`tabular text-[15px] font-bold ${DIR_CLASS[direction]}`}>{marketPrice(asset.sell, asset.unit)}</span>
                <span className={`flex items-center gap-1 text-[11px] font-medium ${DIR_CLASS[direction]}`}>
                  <i className="text-[8px] not-italic" aria-hidden="true">{DIR_ARROW[direction]}</i>
                  {marketChange(asset.changePercent)}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}
