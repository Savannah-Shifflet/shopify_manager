import type { Job } from "bullmq";
import * as cheerio from "cheerio";
import { CheerioCrawler } from "crawlee";
import db from "~/db.server";
import {
  CRAWLEE_DEFAULTS,
  cacheScrape,
  computePayloadHash,
  getCachedScrape,
} from "~/services/scrape.service";
import {
  applyPricingRule,
  createPriceAlert,
  fetchApplicableRule,
  recordPriceChange,
  updatePriceAlertStatus,
} from "~/services/pricing.service";
import { queueProductSync } from "~/services/sync.service";
import type { PriceMonitorPayload } from "./queues";

interface ScrapedPrice {
  sku: string;
  price: string;
}

/**
 * Price monitor job
 * Scrapes a supplier's product page for price changes.
 * Detects changes via SHA-256 hash comparison and creates PriceAlert records.
 */
export async function processPriceMonitor(job: Job<PriceMonitorPayload>) {
  const { shopDomain, supplierId } = job.data;

  console.info({ shopDomain, supplierId }, "Starting price monitor");

  const config = await db.priceMonitorConfig.findFirst({
    where: { shopDomain, supplierId, active: true },
  });
  if (!config) {
    console.info(
      { shopDomain, supplierId },
      "Price monitor: no active config, skipping",
    );
    await job.updateProgress(100);
    return;
  }

  const url = config.scrapeUrl;
  let html = await getCachedScrape(url);
  if (!html) {
    html = await fetchPriceHtml(url);
    if (html) await cacheScrape(url, html);
  }

  await job.updateProgress(40);

  if (!html) {
    await db.priceMonitorConfig.update({
      where: { id: config.id },
      data: { lastScrapedAt: new Date() },
    });
    console.warn(
      { shopDomain, supplierId, url },
      "Price monitor: page fetch returned no HTML",
    );
    await job.updateProgress(100);
    return;
  }

  const priceBySku = buildPriceMap(extractPricesFromHtml(html));

  const products = await db.product.findMany({
    where: { shopDomain, supplierId },
  });

  let alertsCreated = 0;
  let autoApplied = 0;
  for (const product of products) {
    const newPrice = priceBySku.get(product.sku);
    if (!newPrice) continue;

    const oldPrice = product.cost ?? "0";
    if (computePayloadHash({ price: oldPrice }) === computePayloadHash({ price: newPrice })) {
      continue;
    }

    await recordPriceChange(shopDomain, product.id, oldPrice, newPrice, "scrape");

    const rule = await fetchApplicableRule(shopDomain, product.supplierId);
    const suggestedPrice = rule
      ? applyPricingRule(newPrice, rule).toString()
      : undefined;

    const mapViolation =
      product.mapPrice != null && Number(newPrice) < Number(product.mapPrice);

    const alert = await createPriceAlert(shopDomain, {
      productId: product.id,
      oldPrice,
      newPrice,
      suggestedPrice,
      mapViolation,
    });
    alertsCreated++;

    const canAutoApply = rule != null && !mapViolation;
    if (canAutoApply) {
      await updatePriceAlertStatus(shopDomain, alert.id, "auto_applied");
      await queueProductSync(shopDomain, product.id);
      autoApplied++;
    }

    await db.product.update({
      where: { id: product.id, shopDomain },
      data: { cost: newPrice },
    });
  }

  await db.priceMonitorConfig.update({
    where: { id: config.id },
    data: { lastScrapedAt: new Date() },
  });

  console.info(
    {
      shopDomain,
      supplierId,
      scanned: products.length,
      alertsCreated,
      autoApplied,
    },
    "Price monitor complete",
  );
  await job.updateProgress(100);
}

async function fetchPriceHtml(url: string): Promise<string | null> {
  let html: string | null = null;
  const crawler = new CheerioCrawler({
    ...CRAWLEE_DEFAULTS,
    requestHandler: async ({ body }) => {
      html = typeof body === "string" ? body : Buffer.from(body).toString("utf8");
    },
    failedRequestHandler: ({ request }) => {
      console.warn({ url: request.url }, "Price monitor: page fetch failed");
    },
  });
  await crawler.run([url]);
  return html;
}

function buildPriceMap(items: ScrapedPrice[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    if (item.sku && item.price) map.set(item.sku, item.price);
  }
  return map;
}

function extractPricesFromHtml(html: string): ScrapedPrice[] {
  const $ = cheerio.load(html);
  const items: ScrapedPrice[] = [];
  const seen = new Set<string>();

  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).contents().text();
    if (!text) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }
    const queue: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];
    while (queue.length > 0) {
      const node = queue.shift();
      if (!node || typeof node !== "object") continue;
      const obj = node as Record<string, unknown>;
      const type = obj["@type"];

      if (type === "Product") {
        const sku =
          typeof obj.sku === "string"
            ? obj.sku.trim()
            : typeof obj.mpn === "string"
              ? obj.mpn.trim()
              : "";
        const offer = Array.isArray(obj.offers)
          ? (obj.offers[0] as Record<string, unknown> | undefined)
          : (obj.offers as Record<string, unknown> | undefined);
        const price = offer?.price !== undefined ? String(offer.price) : "";
        if (sku && price && !seen.has(sku)) {
          seen.add(sku);
          items.push({ sku, price });
        }
        continue;
      }

      if (type === "ItemList" && Array.isArray(obj.itemListElement)) {
        for (const entry of obj.itemListElement) {
          if (entry && typeof entry === "object" && "item" in entry) {
            queue.push((entry as { item: unknown }).item);
          } else {
            queue.push(entry);
          }
        }
        continue;
      }

      const graph = obj["@graph"];
      if (Array.isArray(graph)) queue.push(...graph);
    }
  });

  return items;
}
