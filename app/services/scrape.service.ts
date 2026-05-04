import IORedis from "ioredis";
import crypto from "node:crypto";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6380");
const SCRAPE_CACHE_TTL_SEC = 60 * 60 * 24;

export function shouldUseBrowser(url: string): boolean {
  const spaIndicators = [
    "/portal",
    "/dealer",
    "/login",
    "react",
    "angular",
    "vue",
  ];
  const lower = url.toLowerCase();
  return spaIndicators.some((i) => lower.includes(i));
}

export async function getCachedScrape(url: string): Promise<string | null> {
  const key = `scrape:${crypto.createHash("sha256").update(url).digest("hex")}`;
  return redis.get(key);
}

export async function cacheScrape(url: string, html: string): Promise<void> {
  const key = `scrape:${crypto.createHash("sha256").update(url).digest("hex")}`;
  await redis.set(key, html, "EX", SCRAPE_CACHE_TTL_SEC);
}

export function computePayloadHash(payload: Record<string, unknown>): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

export const CRAWLEE_DEFAULTS = {
  maxConcurrency: 3, // never exceed 3 concurrent requests per shop
  minConcurrency: 1,
  requestHandlerTimeoutSecs: 60,
  maxRequestRetries: 3,
};
