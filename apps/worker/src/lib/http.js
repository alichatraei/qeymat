/** لایه‌ی نازک روی fetch با timeout، تلاش مجدد و User-Agent ثابت. */

const DEFAULT_UA =
  process.env.CRAWLER_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 QeymatBot/1.0 (+https://qeymat.online)";

export async function request(url, options = {}) {
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
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

export async function fetchJson(url, options) {
  const response = await request(url, options);
  return response.json();
}

export async function fetchText(url, options) {
  const response = await request(url, options);
  return response.text();
}
