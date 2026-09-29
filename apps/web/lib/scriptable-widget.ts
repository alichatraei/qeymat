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
export const WIDGET_VERSION = "1.0";

export const SCRIPTABLE_WIDGET = String.raw`// قیمت — ویجت نرخ لحظه‌ای | qeymat.online
// نسخه ۱٫۰
//
// پارامتر ویجت (اختیاری): نماد دارایی‌ها با کاما
//   USD                    دلار
//   USD,GOLD18,EMAMI,USDT  چند دارایی در ویجت متوسط و بزرگ
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

const param = (args.widgetParameter || "").trim().toUpperCase();
const wanted = param ? param.split(/[\s,،]+/).filter(Boolean) : DEFAULTS;
const family = config.widgetFamily || "medium";

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
  time.font = Font.systemFont(10);
  time.textColor = C.faint;
  row.addSpacer();
  const brand = row.addText("قیمت");
  brand.font = Font.heavySystemFont(13);
  brand.textColor = C.mint;
}

function single(widget, asset, result) {
  background(widget);
  widget.setPadding(14, 14, 14, 14);
  header(widget, result.data.updatedAt, result.offline);
  widget.addSpacer();
  rightText(widget, asset.nameFa, Font.semiboldSystemFont(14), C.sub);
  widget.addSpacer(4);
  rightText(widget, price(asset), Font.heavySystemFont(26), C.text);
  const unit = asset.unit === "USD" ? "" : "تومان";
  if (unit) rightText(widget, unit, Font.systemFont(10), C.faint);
  widget.addSpacer(6);
  const move = change(asset);
  rightText(widget, move.text, Font.boldSystemFont(12), move.color);
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
    delta.font = Font.boldSystemFont(10);
    delta.textColor = move.color;
    row.addSpacer(8);
    const value = row.addText(price(asset));
    value.font = Font.boldSystemFont(15);
    value.textColor = C.text;
    value.lineLimit = 1;
    value.minimumScaleFactor = 0.6;
    row.addSpacer();
    const name = row.addText(asset.nameFa);
    name.font = Font.mediumSystemFont(13);
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
  name.font = Font.semiboldSystemFont(12);
  const value = widget.addText(price(asset));
  value.font = Font.heavySystemFont(family === "accessoryCircular" ? 11 : 18);
  value.minimumScaleFactor = 0.5;
  if (family === "accessoryRectangular") {
    const move = widget.addText(change(asset).text);
    move.font = Font.systemFont(11);
  }
}

async function build() {
  const widget = new ListWidget();
  const result = await load();
  if (!result) {
    background(widget);
    rightText(widget, "قیمت", Font.heavySystemFont(14), C.mint);
    widget.addSpacer();
    rightText(widget, "اتصال برقرار نشد", Font.systemFont(12), C.sub);
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

  // iOS خودش زمان تازه‌سازی را تعیین می‌کند؛ این فقط کمترین فاصله است
  widget.refreshAfterDate = new Date(Date.now() + 10 * 60 * 1000);
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
