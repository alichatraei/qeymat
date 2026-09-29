/** لایه‌ی نازک روی fetch با timeout، تلاش مجدد و User-Agent ثابت. */

const DEFAULT_UA =
  process.env.CRAWLER_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 QeymatBot/1.0 (+https://qeymat.online)";

/**
 * درخواست و خواندن بدنه، هر دو زیر یک timeout.
 *
 * timeout باید تا پایان خواندن بدنه بماند: اگر سرور هدر را بفرستد و بعد
 * بدنه را نیمه‌کاره نگه دارد (در شبکه‌ی ایران و پشت رله رایج است)، خواندن
 * بدنه بی‌پایان منتظر می‌ماند و زمان‌بند آن منبع را برای همیشه «در حال
 * اجرا» می‌بیند.
 */
async function send(url, options, read) {
  const { timeoutMs = 12000, retries = 2, headers = {}, ...rest } = options;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...rest,
        signal: controller.signal,
        headers: { "User-Agent": DEFAULT_UA, ...headers },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} برای ${url}`);
      return await read(response);
    } catch (error) {
      lastError =
        error?.name === "AbortError" ? new Error(`timeout ${timeoutMs}ms برای ${url}`) : error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

export function fetchJson(url, options = {}) {
  return send(url, options, (response) => response.json());
}

export function fetchText(url, options = {}) {
  return send(url, options, (response) => response.text());
}
