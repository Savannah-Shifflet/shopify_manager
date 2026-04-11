import db from "~/db.server";
import { catalogScrapeQueue } from "~/jobs/queues";

/**
 * Enqueues a file-based catalog import.
 * The file should already be stored at fileKey (temp storage).
 */
export async function queueFileImport(
  shopDomain: string,
  supplierId: string,
  fileKey: string,
) {
  const job = await catalogScrapeQueue.add(
    "file-import",
    { shopDomain, supplierId, scrapeUrl: "", mode: "file", fileKey },
    { priority: 1 },
  );
  return { jobId: job.id };
}

/**
 * Enqueues a URL-based catalog scrape.
 */
export async function queueUrlScrape(
  shopDomain: string,
  supplierId: string,
  url: string,
) {
  const job = await catalogScrapeQueue.add(
    "url-scrape",
    { shopDomain, supplierId, scrapeUrl: url, mode: "url" },
    { priority: 1 },
  );
  return { jobId: job.id };
}

/**
 * Performs fuzzy column name matching against known field names.
 * Returns a map of detected column → app field name.
 *
 * TODO: implement fuzzy matching (e.g., Levenshtein distance or keyword matching)
 */
export function detectColumnMapping(headers: string[]): Record<string, string> {
  const KNOWN_FIELDS: Record<string, string[]> = {
    title: [
      "item name",
      "product name",
      "name",
      "description",
      "product",
      "title",
    ],
    sku: [
      "sku",
      "item #",
      "item number",
      "part number",
      "part #",
      "upc",
      "mpn",
    ],
    cost: [
      "your cost",
      "cost",
      "wholesale price",
      "dealer cost",
      "dealer price",
    ],
    msrp: ["msrp", "retail price", "suggested retail", "list price", "srp"],
    mapPrice: ["map", "map price", "minimum advertised price"],
  };

  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(KNOWN_FIELDS)) {
      if (aliases.some((a) => normalized.includes(a))) {
        mapping[header] = field;
        break;
      }
    }
  }

  return mapping;
}
