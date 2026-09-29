/**
 * اسکریپت ویجت «قیمت» برای اپ Scriptable در آیفون.
 *
 * آیفون به PWA اجازه‌ی ویجت نمی‌دهد؛ Scriptable اپ رایگانی است که با
 * جاوااسکریپت ویجت صفحه‌ی اصلی و قفل می‌سازد. کاربر این متن را در یک
 * اسکریپت تازه می‌چسباند و ویجت Scriptable را روی صفحه می‌گذارد.
 *
 * متن داخل String.raw است تا \s و مانند آن دست‌نخورده بماند؛ پس داخل
 * اسکریپت نباید backtick یا ${ باشد.
 */
export const WIDGET_VERSION = "1.1";

export const SCRIPTABLE_WIDGET = String.raw`// قیمت — ویجت نرخ لحظه‌ای | qeymat.online
// نسخه ۱٫۱
//
// پارامتر ویجت (اختیاری) — بخش‌ها با فاصله از هم جدا می‌شوند:
//   USD,GOLD18,EMAMI   نماد دارایی‌ها با کاما
//   5m / 30m / 1h      هر چند وقت یک‌بار تازه شود (کمترین ۵ دقیقه، پیش‌فرض ۱۰ دقیقه)
//   vazir              فونت وزیرمتن (اول پروفایل فونت را از qeymat.online/widget نصب کنید)
// نمونه: USD,GOLD18 5m vazir
// نمادها: USD EUR AED TRY GBP GOLD18 GOLD24 EMAMI HALF QUARTER GRAMI ABSHODEH USDT BTC ETH BRENT

const API = "https://qeymat.online/api/public/rates";
const SITE = "https://qeymat.online";
const DEFAULTS = ["USD", "EUR", "GOLD18", "EMAMI", "USDT", "BTC"];

const C = {
  top: new Color("#11443a"),
  bottom: new Color("#06120d"),
  text: Color.white(),
  sub: new Color("#ffffff", 0.6),
  faint: new Color("#ffffff", 0.4),
  up: new Color("#4fd6a4"),
  down: new Color("#ff8a80"),
  mint: new Color("#8fd8b8"),
};

const options = parseParameter(args.widgetParameter || "");
const wanted = options.symbols.length ? options.symbols : DEFAULTS;
const family = config.widgetFamily || "medium";

/** «USD,GOLD18 5m vazir» ← نمادها، فاصله‌ی تازه‌سازی (دقیقه) و فونت */
function parseParameter(raw) {
  const result = { symbols: [], minutes: 10, vazir: false };
  for (const token of raw.trim().split(/\s+/).filter(Boolean)) {
    const lower = token.toLowerCase();
    const interval = /^(\d+)(m|min|h)?$/.exec(lower);
    if (lower === "vazir" || lower === "وزیر") result.vazir = true;
    else if (interval) result.minutes = Number(interval[1]) * (interval[2] === "h" ? 60 : 1);
    else result.symbols.push(...token.toUpperCase().split(/[,،]+/).filter(Boolean));
  }
  // iOS کمتر از چند دقیقه را نمی‌پذیرد و بیش از یک روز هم معنا ندارد
  result.minutes = Math.min(24 * 60, Math.max(5, result.minutes));
  return result;
}

/** فونت وزیرمتن اگر خواسته شده باشد؛ وگرنه فونت سیستم با همان وزن */
const VAZIR = { regular: "Vazirmatn-Regular", medium: "Vazirmatn-Medium", bold: "Vazirmatn-Bold", heavy: "Vazirmatn-ExtraBold" };
function F(weight, size) {
  if (options.vazir) return new Font(VAZIR[weight], size);
  if (weight === "heavy") return Font.heavySystemFont(size);
  if (weight === "bold") return Font.boldSystemFont(size);
  if (weight === "medium") return Font.mediumSystemFont(size);
  return Font.systemFont(size);
}

function fa(value, digits) {
  return Number(value).toLocaleString("fa-IR", { maximumFractionDigits: digits || 0 });
}

function price(asset) {
  if (asset.unit === "USD") return fa(asset.sell, asset.sell < 100 ? 2 : 0) + " دلار";
  return fa(Math.round(asset.sell));
}

function change(asset) {
  const value = Number(asset.changePercent || 0);
  if (!value) return { text: "—", color: C.faint };
  return {
    text: (value > 0 ? "▲ " : "▼ ") + fa(Math.abs(value), 2) + "٪",
    color: value > 0 ? C.up : C.down,
  };
}

async function load() {
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.documentsDirectory(), "qeymat-rates.json");
  try {
    const request = new Request(API);
    request.timeoutInterval = 15;
    request.headers = { "x-qeymat-client": "scriptable/1.0" };
    const data = await request.loadJSON();
    if (!data || !data.assets) throw new Error("پاسخ نامعتبر");
    fm.writeString(cache, JSON.stringify(data));
    return { data: data, offline: false };
  } catch (error) {
    // بدون اینترنت آخرین نرخ‌های ذخیره‌شده نشان داده می‌شود
    if (fm.fileExists(cache)) return { data: JSON.parse(fm.readString(cache)), offline: true };
    return null;
  }
}

function clock(iso) {
  const formatter = new DateFormatter();
  formatter.locale = "fa_IR";
  formatter.dateFormat = "HH:mm";
  return formatter.string(new Date(iso));
}

/** متن راست‌چین در یک ردیف */
function rightText(parent, value, font, color) {
  const row = parent.addStack();
  row.addSpacer();
  const text = row.addText(value);
  text.font = font;
  text.textColor = color;
  text.lineLimit = 1;
  text.minimumScaleFactor = 0.5;
  return text;
}

function background(widget) {
  const gradient = new LinearGradient();
  gradient.colors = [C.top, C.bottom];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
}

function header(widget, updatedAt, offline) {
  const row = widget.addStack();
  row.centerAlignContent();
  const time = row.addText((offline ? "آفلاین · " : "") + clock(updatedAt));
  time.font = F("regular", 10);
  time.textColor = C.faint;
  row.addSpacer();
  const brand = row.addText("قیمت");
  brand.font = F("heavy", 13);
  brand.textColor = C.mint;
}

function single(widget, asset, result) {
  background(widget);
  widget.setPadding(14, 14, 14, 14);
  header(widget, result.data.updatedAt, result.offline);
  widget.addSpacer();
  rightText(widget, asset.nameFa, F("bold", 14), C.sub);
  widget.addSpacer(4);
  rightText(widget, price(asset), F("heavy", 26), C.text);
  const unit = asset.unit === "USD" ? "" : "تومان";
  if (unit) rightText(widget, unit, F("regular", 10), C.faint);
  widget.addSpacer(6);
  const move = change(asset);
  rightText(widget, move.text, F("bold", 12), move.color);
}

function list(widget, assets, result, max) {
  background(widget);
  widget.setPadding(12, 14, 12, 14);
  header(widget, result.data.updatedAt, result.offline);
  widget.addSpacer(8);
  for (const asset of assets.slice(0, max)) {
    const row = widget.addStack();
    row.centerAlignContent();
    const move = change(asset);
    const delta = row.addText(move.text);
    delta.font = F("bold", 10);
    delta.textColor = move.color;
    row.addSpacer(8);
    const value = row.addText(price(asset));
    value.font = F("bold", 15);
    value.textColor = C.text;
    value.lineLimit = 1;
    value.minimumScaleFactor = 0.6;
    row.addSpacer();
    const name = row.addText(asset.nameFa);
    name.font = F("medium", 13);
    name.textColor = C.sub;
    name.lineLimit = 1;
    widget.addSpacer(family === "large" ? 9 : 5);
  }
  widget.addSpacer();
}

function accessory(widget, asset) {
  // ویجت صفحه‌ی قفل: بی‌زمینه، یک دارایی
  if (family === "accessoryInline") {
    widget.addText(asset.nameFa + " " + price(asset));
    return;
  }
  const name = widget.addText(asset.nameFa);
  name.font = F("bold", 12);
  const value = widget.addText(price(asset));
  value.font = F("heavy", family === "accessoryCircular" ? 11 : 18);
  value.minimumScaleFactor = 0.5;
  if (family === "accessoryRectangular") {
    const move = widget.addText(change(asset).text);
    move.font = F("regular", 11);
  }
}

async function build() {
  const widget = new ListWidget();
  const result = await load();
  if (!result) {
    background(widget);
    rightText(widget, "قیمت", F("heavy", 14), C.mint);
    widget.addSpacer();
    rightText(widget, "اتصال برقرار نشد", F("regular", 12), C.sub);
    widget.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);
    return widget;
  }

  const bySymbol = {};
  for (const asset of result.data.assets) bySymbol[asset.symbol] = asset;
  const assets = wanted.map((symbol) => bySymbol[symbol]).filter(Boolean);
  if (!assets.length && bySymbol.USD) assets.push(bySymbol.USD);

  const first = assets[0];
  widget.url = SITE + "/chart?symbol=" + (first ? first.symbol : "USD");

  if (family.indexOf("accessory") === 0) accessory(widget, first);
  else if (family === "small") single(widget, first, result);
  else list(widget, assets, result, family === "large" ? 8 : 3);

  // زودترین زمان تازه‌سازی؛ زمان دقیق را iOS بر اساس باتری و استفاده تعیین می‌کند
  widget.refreshAfterDate = new Date(Date.now() + options.minutes * 60 * 1000);
  return widget;
}

const widget = await build();
if (config.runsInWidget || config.runsInAccessoryWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
`;
