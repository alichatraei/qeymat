import Redis from "ioredis";
import { log } from "./log.js";

const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let client = null;
let publisher = null;

function getClient() {
  if (!client) {
    client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: false });
    client.on("error", (error) => log.warn("Redis:", error.message));
  }
  return client;
}

export const cache = {
  async get(key) {
    try {
      return await getClient().get(key);
    } catch {
      return null;
    }
  },
  async set(key, value, ttlSeconds) {
    try {
      if (ttlSeconds) await getClient().set(key, value, "EX", ttlSeconds);
      else await getClient().set(key, value);
      return true;
    } catch {
      return false;
    }
  },
  async del(key) {
    try {
      await getClient().del(key);
    } catch {
      /* بی‌اهمیت */
    }
  },
};

export async function publish(channel, payload) {
  try {
    if (!publisher) publisher = new Redis(url);
    await publisher.publish(channel, JSON.stringify(payload));
  } catch {
    /* انتشار رویداد حیاتی نیست */
  }
}

export async function closeCache() {
  await Promise.allSettled([client?.quit(), publisher?.quit()]);
}
