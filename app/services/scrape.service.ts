/**
 * Crawlee-based scraping utilities.
 * Shared helpers for supplier-discovery and catalog-scrape jobs.
 *
 * Uses PlaywrightCrawler for JS-rendered pages (SPAs, login-gated portals)
 * and CheerioCrawler for static HTML (saves browser resources).
 *
 * Rules:
 * - Respect robots.txt where legally required
 * - 1–3 second randomized delay between requests (managed via Crawlee concurrency config)
 * - Cache scraped HTML in Redis for 24h (key: scrape:{url_hash})
 * - Never embed Playwright page handles in job payloads — serialize as plain JSON
 */

import IORedis from "ioredis";
import crypto from "node:crypto";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379");
const SCRAPE_CACHE_TTL_SEC = 60 * 60 * 24; // 24 hours

/**
 * Heuristic: should we use a browser (Playwright) or Cheerio?
 * Returns true if the URL likely requires a JS-rendered page.
 */
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

/**
 * Check Redis scrape cache. Returns null if not cached.
 */
export async function getCachedScrape(url: string): Promise<string | null> {
  const key = `scrape:${crypto.createHash("sha256").update(url).digest("hex")}`;
  return redis.get(key);
}

/**
 * Store scraped HTML in Redis with 24h TTL.
 */
export async function cacheScrape(url: string, html: string): Promise<void> {
  const key = `scrape:${crypto.createHash("sha256").update(url).digest("hex")}`;
  await redis.set(key, html, "EX", SCRAPE_CACHE_TTL_SEC);
}

/**
 * Computes a SHA-256 hash of a product payload for sync deduplication.
 */
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
