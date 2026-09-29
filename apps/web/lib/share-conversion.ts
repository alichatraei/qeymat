/**
 * اشتراک نتیجه‌ی تبدیل ارز با قالب «قیمت»؛ به‌صورت متن یا تصویر.
 *
 * تصویر همین‌جا روی canvas کشیده می‌شود (بدون سرور)، با لوگو، دو ارز،
 * نرخ، نتیجه، تاریخ و ساعت و پیام معرفی سایت.
 */

export type Conversion = {
  amount: string;
  fromName: string;
  toName: string;
  result: string;
  /** «هر دلار آمریکا = ۲۴۴٬۷۰۰ تومان» */
  rateLine: string;
  at: Date;
};

export const SITE_URL = "https://qeymat.online";
const PROMO = "قیمت لحظه‌ای دلار، طلا، سکه و رمزارز را در «قیمت» ببینید";

export function stamp(at: Date) {
  const parts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tehran",
  }).formatToParts(at)) {
    parts[part.type] = part.value;
  }
  return {
    date: `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function conversionText(c: Conversion) {
  const { date, time } = stamp(c.at);
  return [
    "💱 تبدیل ارز | قیمت",
    "",
    `${c.amount} ${c.fromName} = ${c.result} ${c.toName}`,
    `📊 ${c.rateLine}`,
    `🕒 ${date} · ساعت ${time}`,
    "",
    `${PROMO}:`,
    SITE_URL,
  ].join("\n");
}

/* ----------------------------- تصویر ----------------------------- */

const W = 1080;
const H = 1350;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function conversionImage(c: Conversion): Promise<Blob> {
  // خانواده‌ی قلم واقعی next/font از خود صفحه خوانده می‌شود
  const family = getComputedStyle(document.body).fontFamily || "Vazirmatn, Tahoma, sans-serif";
  await Promise.all(
    [400, 600, 800].map((weight) => document.fonts?.load(`${weight} 40px ${family}`).catch(() => null)),
  );

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  // بعضی مرورگرها ctx.direction را ندارند و جهت را از خود عنصر می‌گیرند
  canvas.dir = "rtl";
  canvas.style.cssText = "position:fixed;left:-99999px;top:0;pointer-events:none";
  document.body.appendChild(canvas);

  try {
    const ctx = canvas.getContext("2d")!;
    ctx.direction = "rtl";
    const font = (weight: number, size: number) => `${weight} ${size}px ${family}`;
    /** اندازه‌ی قلم تا جایی کم می‌شود که متن در پهنا جا شود */
    const fit = (text: string, weight: number, size: number, max: number) => {
      let current = size;
      ctx.font = font(weight, current);
      while (ctx.measureText(text).width > max && current > 18) {
        current -= 2;
        ctx.font = font(weight, current);
      }
      return current;
    };

    // ---- زمینه: سبز برند با نور ملایم و شبکه ----
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#11443a");
    bg.addColorStop(1, "#06120d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.85, 120, 0, W * 0.85, 120, 700);
    glow.addColorStop(0, "rgba(143,216,184,.22)");
    glow.addColorStop(1, "rgba(143,216,184,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.035)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 54) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 54) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const pad = 80;
    const right = W - pad;

    // ---- سربرگ: لوگو و نام ----
    const logo = await loadImage("/icon-512.png").catch(() => null);
    if (logo) {
      ctx.save();
      roundRect(ctx, right - 132, 86, 132, 132, 32);
      ctx.clip();
      ctx.drawImage(logo, right - 132, 86, 132, 132);
      ctx.restore();
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.font = font(800, 64);
    ctx.fillText("قیمت", right - 160, 158);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.font = font(400, 30);
    ctx.fillText("qeymat.online", right - 160, 204);

    ctx.textAlign = "left";
    ctx.fillStyle = "#8fd8b8";
    ctx.font = font(800, 34);
    ctx.fillText("تبدیل ارز", pad, 160);

    // ---- کارت نتیجه ----
    const cardTop = 300;
    const cardHeight = 560;
    roundRect(ctx, pad, cardTop, W - pad * 2, cardHeight, 44);
    ctx.fillStyle = "rgba(255,255,255,.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const inner = W - pad * 2 - 120;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,.62)";
    ctx.font = font(600, 34);
    ctx.fillText("مبلغ", W / 2, cardTop + 90);

    const fromLine = `${c.amount} ${c.fromName}`;
    ctx.fillStyle = "#ffffff";
    fit(fromLine, 800, 62, inner);
    ctx.fillText(fromLine, W / 2, cardTop + 178);

    // پیکان رو به پایین بین دو ارز
    ctx.strokeStyle = "#8fd8b8";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(W / 2, cardTop + 222);
    ctx.lineTo(W / 2, cardTop + 290);
    ctx.moveTo(W / 2 - 22, cardTop + 268);
    ctx.lineTo(W / 2, cardTop + 290);
    ctx.lineTo(W / 2 + 22, cardTop + 268);
    ctx.stroke();

    ctx.fillStyle = "#f3d27a";
    fit(c.result, 800, 112, inner);
    ctx.fillText(c.result, W / 2, cardTop + 410);
    ctx.fillStyle = "rgba(255,255,255,.85)";
    fit(c.toName, 600, 46, inner);
    ctx.fillText(c.toName, W / 2, cardTop + 486);

    // ---- نرخ و زمان ----
    const { date, time } = stamp(c.at);
    ctx.fillStyle = "#ffffff";
    fit(c.rateLine, 600, 38, W - pad * 2);
    ctx.fillText(c.rateLine, W / 2, cardTop + cardHeight + 96);
    ctx.fillStyle = "rgba(255,255,255,.6)";
    const when = `${date} · ساعت ${time}`;
    fit(when, 400, 32, W - pad * 2);
    ctx.fillText(when, W / 2, cardTop + cardHeight + 150);

    // ---- پیام معرفی ----
    const footTop = H - 210;
    roundRect(ctx, pad, footTop, W - pad * 2, 130, 34);
    ctx.fillStyle = "#8fd8b8";
    ctx.fill();
    ctx.fillStyle = "#06231b";
    fit(PROMO, 600, 30, W - pad * 2 - 80);
    ctx.fillText(PROMO, W / 2, footTop + 56);
    ctx.font = font(800, 38);
    ctx.fillText("qeymat.online", W / 2, footTop + 104);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("ساخت تصویر ناموفق بود"))), "image/png"),
    );
  } finally {
    canvas.remove();
  }
}

/* ----------------------------- ارسال ----------------------------- */

export type ShareOutcome = "shared" | "copied" | "downloaded" | "cancelled";

export async function shareText(text: string): Promise<ShareOutcome> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return "cancelled";
    }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}

export async function shareImage(blob: Blob, caption: string): Promise<ShareOutcome> {
  const file = new File([blob], "qeymat-tabdil.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: caption });
      return "shared";
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return "cancelled";
    }
  }
  // مرورگری که اشتراک فایل ندارد: تصویر دانلود می‌شود
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}
