import { useId } from "react";

/**
 * آواتار تصویری دارایی‌هایی که پرچم ندارند: طلا و سکه، رمزارز، کالا، سهام و
 * شاخص. همه SVG درون‌خطی‌اند (بدون فایل و درخواست اضافه) و در قاب گرد
 * RateIcon با viewBox ۴۰×۴۰ کشیده می‌شوند.
 *
 * برای نمادی که اینجا نیست null برمی‌گردد و RateIcon سراغ نشانه‌ی متنی
 * (mark) می‌رود؛ دارایی تازه‌ای که از پنل اضافه شود بی‌آیکون نمی‌ماند.
 */

type Art = (id: string) => React.ReactNode;

const TEXT = {
  fontFamily: "inherit",
  fontWeight: 800,
  textAnchor: "middle" as const,
  dominantBaseline: "central" as const,
};

/* ---------- طلا ---------- */

function goldGradient(id: string) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#FFE58A" />
      <stop offset=".55" stopColor="#E9B730" />
      <stop offset="1" stopColor="#B7841B" />
    </linearGradient>
  );
}

/** شمش با برچسب (عیار یا نماد) */
function bar(
  label: string,
  colors = {
    top: "#FFE58A",
    mid: "#E9B730",
    low: "#B7841B",
    bg: "#FFF4D6",
    ink: "#7A5410",
  },
): Art {
  return function draw(id: string) {
    return (
      <>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={colors.top} />
            <stop offset=".55" stopColor={colors.mid} />
            <stop offset="1" stopColor={colors.low} />
          </linearGradient>
        </defs>
        <rect width="40" height="40" fill={colors.bg} />
        {/* سطح بالا و بدنه‌ی شمش */}
        <path d="M11 14h18l5 13H6z" fill={`url(#${id})`} />
        <path d="M11 14h18l-2 3H13z" fill="#fff" opacity=".35" />
        <path d="M6 27h28v2.5H6z" fill={colors.low} />
        <text x="20" y="22" fontSize="8.5" fill={colors.ink} {...TEXT}>
          {label}
        </text>
      </>
    );
  };
}

/** سکه با لبه‌ی دندانه‌دار؛ اندازه‌ی سکه با وزنش کوچک می‌شود */
function coin(label: string, radius = 15, fontSize = 7.5): Art {
  return function draw(id: string) {
    return (
      <>
        <defs>{goldGradient(id)}</defs>
        <rect width="40" height="40" fill="#FFF4D6" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill={`url(#${id})`}
          stroke="#B7841B"
          strokeWidth="1"
        />
        <circle
          cx="20"
          cy="20"
          r={radius - 2.4}
          fill="none"
          stroke="#9A6C12"
          strokeWidth=".7"
          strokeDasharray="1 1.2"
          opacity=".7"
        />
        <ellipse
          cx={20 - radius * 0.35}
          cy={20 - radius * 0.45}
          rx={radius * 0.35}
          ry={radius * 0.18}
          fill="#fff"
          opacity=".35"
        />
        <text x="20" y="20.5" fontSize={fontSize} fill="#6B4A0C" {...TEXT}>
          {label}
        </text>
      </>
    );
  };
}

/** طلای آبشده: قطعه‌ی ریخته‌شده‌ی نامنظم با وجه‌های براق */
const molten: Art = (id) => (
  <>
    <defs>{goldGradient(id)}</defs>
    <rect width="40" height="40" fill="#FFF4D6" />
    <ellipse cx="20" cy="30" rx="12" ry="2" fill="#B7841B" opacity=".25" />
    <path
      d="M8 25l3-8 7-4 8 1 6 5 1 6-5 4-10 1-7-2z"
      fill={`url(#${id})`}
      stroke="#9A6C12"
      strokeWidth=".8"
      strokeLinejoin="round"
    />
    {/* وجه‌ها */}
    <path
      d="M11 17l6 4 9-7M17 21l1 9M17 21l16 4"
      stroke="#9A6C12"
      strokeWidth=".6"
      fill="none"
      opacity=".55"
    />
    <path d="M12 18l5-3.5 5 .5-5 5z" fill="#fff" opacity=".45" />
  </>
);

/* ---------- رمزارز ---------- */

function glyph(
  background: string,
  text: string,
  fontSize = 20,
  color = "#fff",
  rotate = 0,
): Art {
  return function draw() {
    return (
      <>
        <rect width="40" height="40" fill={background} />
        <text
          x="20"
          y="21"
          fontSize={fontSize}
          fill={color}
          transform={rotate ? `rotate(${rotate} 20 20)` : undefined}
          {...TEXT}
        >
          {text}
        </text>
      </>
    );
  };
}

const ethereum: Art = () => (
  <>
    <rect width="40" height="40" fill="#627EEA" />
    <path d="M20 7l-8 13.3 8 4.7 8-4.7z" fill="#fff" />
    <path d="M20 7v18l8-4.7z" fill="#fff" opacity=".6" />
    <path d="M12 22.2l8 11 8-11-8 4.7z" fill="#fff" />
    <path d="M20 26.9v6.3l8-11z" fill="#fff" opacity=".6" />
  </>
);

const solana: Art = (id) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#9945FF" />
        <stop offset="1" stopColor="#14F195" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" fill="#111" />
    <g fill={`url(#${id})`}>
      <path d="M13 12h16l-3 3H10z" />
      <path d="M10 18.5h16l3 3H13z" />
      <path d="M13 25h16l-3 3H10z" />
    </g>
  </>
);

const ton: Art = () => (
  <>
    <rect width="40" height="40" fill="#0098EA" />
    <path
      d="M12 12h16l-8 17z"
      fill="none"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path d="M20 12v17" stroke="#fff" strokeWidth="2.2" />
  </>
);

const ripple: Art = () => (
  <>
    <rect width="40" height="40" fill="#23292F" />
    <path
      d="M11 12h3.5l5.5 5.4 5.5-5.4H29l-7.4 7.2a2.3 2.3 0 0 1-3.2 0zM11 28h3.5l5.5-5.4 5.5 5.4H29l-7.4-7.2a2.3 2.3 0 0 0-3.2 0z"
      fill="#fff"
    />
  </>
);

const bnb: Art = () => (
  <>
    <rect width="40" height="40" fill="#F3BA2F" />
    <g fill="#fff">
      <path d="M20 10l3 3-3 3-3-3z" />
      <path d="M20 24l3 3-3 3-3-3z" />
      <path d="M13 17l3 3-3 3-3-3z" />
      <path d="M27 17l3 3-3 3-3-3z" />
      <path d="M20 17l3 3-3 3-3-3z" />
    </g>
  </>
);

const tron: Art = () => (
  <>
    <rect width="40" height="40" fill="#EB0029" />
    <path
      d="M10 11l20 5-11 14z"
      fill="none"
      stroke="#fff"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M10 11l11 8 9-3M21 19l-2 11"
      fill="none"
      stroke="#fff"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </>
);

const cardano: Art = () => (
  <>
    <rect width="40" height="40" fill="#0033AD" />
    <g fill="#fff">
      <circle cx="20" cy="20" r="3" />
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (index * Math.PI) / 3;
        return (
          <circle
            key={index}
            cx={20 + Math.cos(angle) * 8}
            cy={20 + Math.sin(angle) * 8}
            r="1.9"
          />
        );
      })}
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (index * Math.PI) / 3 + Math.PI / 6;
        return (
          <circle
            key={`o${index}`}
            cx={20 + Math.cos(angle) * 13}
            cy={20 + Math.sin(angle) * 13}
            r="1.1"
          />
        );
      })}
    </g>
  </>
);

/* ---------- کالا ---------- */

function oil(label: string, background: string): Art {
  return function draw(id: string) {
    return (
      <>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4B5563" />
            <stop offset="1" stopColor="#0B0F14" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" fill={background} />
        <path
          d="M20 7c5 7 9 11.5 9 16.5a9 9 0 0 1-18 0C11 18.5 15 14 20 7z"
          fill={`url(#${id})`}
        />
        <path
          d="M15.5 23.5a4.5 4.5 0 0 0 3 4.2"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          opacity=".45"
        />
        <text x="20" y="24" fontSize="7" fill="#fff" {...TEXT}>
          {label}
        </text>
      </>
    );
  };
}

/** گاز طبیعی: شعله‌ی آبی */
const flame: Art = (id) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#1D4ED8" />
        <stop offset=".6" stopColor="#38BDF8" />
        <stop offset="1" stopColor="#BAE6FD" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" fill="#E0F2FE" />
    <path
      d="M20 7c1 5 7 8 7 15a7 7 0 0 1-14 0c0-3 1.5-5 3.5-6.5 0 2.5 1 4 2.5 4.5C18 15 18.5 11 20 7z"
      fill={`url(#${id})`}
    />
    <path d="M20 22c1.5 1.5 3 3 3 5a3 3 0 0 1-6 0c0-2 1.5-3.5 3-5z" fill="#fff" opacity=".75" />
  </>
);

/* ---------- سهام و شاخص ---------- */

function ticker(text: string, background: string, color = "#fff"): Art {
  return function draw() {
    return (
      <>
        <rect width="40" height="40" fill={background} />
        <text
          x="20"
          y="20.5"
          fontSize={text.length > 4 ? 7.4 : 8.6}
          fill={color}
          letterSpacing="-.2"
          {...TEXT}
        >
          {text}
        </text>
      </>
    );
  };
}

function indexChart(label: string, background: string): Art {
  return function draw() {
    return (
      <>
        <rect width="40" height="40" fill={background} />
        <path
          d="M8 27l7-6 5 3 9-10"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M25 14h4v4"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="20" y="32.5" fontSize="5.6" fill="#fff" opacity=".9" {...TEXT}>
          {label}
        </text>
      </>
    );
  };
}

const ARTS: Record<string, Art> = {
  // طلا و سکه
  GOLD18: bar("18"),
  GOLD24: bar("24"),
  ABSHODEH: molten,
  EMAMI: coin("امامی"),
  BAHAR: coin("بهار"),
  HALF: coin("نیم", 13.5, 8),
  QUARTER: coin("ربع", 12, 7.5),
  GRAMI: coin("گرمی", 10.5, 6),
  OUNCE: coin("oz", 15, 10),

  // رمزارز
  USDT: glyph("#26A17B", "₮", 22),
  BTC: glyph("#F7931A", "₿", 22, "#fff", 12),
  ETH: ethereum,
  SOL: solana,
  TON: ton,
  XRP: ripple,
  DOGE: glyph("#C2A633", "Ð", 21),
  BNB: bnb,
  TRX: tron,
  ADA: cardano,

  // کالا
  BRENT: oil("B", "#E0F2FE"),
  WTI: oil("W", "#FEF3C7"),
  OPEC: oil("O", "#DCFCE7"),
  NATGAS: flame,
  XAU: bar("Au"),
  XAG: bar("Ag", {
    top: "#F8FAFC",
    mid: "#C7CDD6",
    low: "#8A94A3",
    bg: "#EEF2F6",
    ink: "#3F4854",
  }),
  XPT: bar("Pt", {
    top: "#F1F5F9",
    mid: "#B8C2CF",
    low: "#6B7686",
    bg: "#E8EDF3",
    ink: "#334155",
  }),
  XPD: bar("Pd", {
    top: "#F5F3FF",
    mid: "#C4BFD9",
    low: "#77708F",
    bg: "#EEECF6",
    ink: "#3B3552",
  }),
  SILVER999: bar("999", {
    top: "#F8FAFC",
    mid: "#C7CDD6",
    low: "#8A94A3",
    bg: "#EEF2F6",
    ink: "#3F4854",
  }),
  XCU: bar("Cu", {
    top: "#F6B98A",
    mid: "#C8753C",
    low: "#8E4A1E",
    bg: "#FCEBDD",
    ink: "#5A2C0E",
  }),

  // سهام
  AAPL: ticker("AAPL", "#111111"),
  TSLA: ticker("TSLA", "#CC0000"),
  NVDA: ticker("NVDA", "#76B900"),
  MSFT: ticker("MSFT", "#00A4EF"),
  GOOGL: ticker("GOOGL", "#4285F4"),
  AMZN: ticker("AMZN", "#FF9900", "#111111"),
  META: ticker("META", "#0668E1"),

  // شاخص
  SPX: indexChart("S&P 500", "#1E3A8A"),
  IXIC: indexChart("NASDAQ", "#0996C7"),
};

/**
 * محتوای SVG آواتار بدون hook — برای تصویرهای سمت سرور (ربات تلگرام) که
 * react-dom/server در آن‌ها مجاز نیست. id باید در همان SVG یکتا باشد.
 */
export function assetArtContent(symbol: string, id: string) {
  const art = ARTS[symbol];
  return art ? art(id) : null;
}

export function hasAssetArt(symbol: string) {
  return symbol in ARTS;
}

export default function AssetArt({
  symbol,
  title,
}: {
  symbol: string;
  title?: string;
}) {
  // شناسه‌ی گرادیان باید در صفحه یکتا باشد؛ چند آیکون یکسان کنار هم می‌آیند
  const id = `art${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const art = ARTS[symbol];
  if (!art) return null;
  return (
    <svg
      viewBox="0 0 40 40"
      className="h-full w-full"
      role="img"
      aria-label={title}
    >
      {art(id)}
    </svg>
  );
}
