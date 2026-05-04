import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import type { Job } from "bullmq";
import * as cheerio from "cheerio";
import { CheerioCrawler, PlaywrightCrawler } from "crawlee";
import { parse as parseCsvStream } from "csv-parse";
import * as XLSX from "xlsx";
import {
  CRAWLEE_DEFAULTS,
  cacheScrape,
  getCachedScrape,
  shouldUseBrowser,
} from "~/services/scrape.service";
import { detectColumnMapping } from "~/services/import.service";
import { createProduct } from "~/services/supplier.service";
import type { CatalogScrapePayload } from "./queues";

interface MappedProductFields {
  title: string;
  sku: string;
  cost?: string;
  msrp?: string;
  mapPrice?: string;
}

interface ScrapedProduct extends MappedProductFields {
  raw: Record<string, unknown>;
}

/**
 * Catalog scrape job
 * Scrapes a supplier product catalog page or processes an uploaded file (CSV/Excel).
 * Uses Crawlee for web scraping, csv-parse + xlsx for file parsing.
 */
export async function processCatalogScrape(job: Job<CatalogScrapePayload>) {
  const { shopDomain, supplierId, scrapeUrl, mode, fileKey } = job.data;

  console.info({ shopDomain, supplierId, mode }, "Starting catalog scrape");

  let created = 0;
  if (mode === "file") {
    if (!fileKey) {
      console.warn(
        { shopDomain, supplierId },
        "Catalog scrape: file mode requires fileKey, skipping",
      );
    } else {
      created = await processFileImport(shopDomain, supplierId, fileKey);
    }
  } else {
    created = await processUrlScrape(shopDomain, supplierId, scrapeUrl);
  }

  console.info(
    { shopDomain, supplierId, mode, created },
    "Catalog scrape complete",
  );
  await job.updateProgress(100);
}

// ─── File mode ───

async function processFileImport(
  shopDomain: string,
  supplierId: string,
  fileKey: string,
): Promise<number> {
  const ext = path.extname(fileKey).toLowerCase();
  const isExcel = ext === ".xlsx" || ext === ".xls";

  if (isExcel) {
    return importExcel(shopDomain, supplierId, fileKey);
  }
  return importCsvStream(shopDomain, supplierId, fileKey);
}

async function importExcel(
  shopDomain: string,
  supplierId: string,
  filePath: string,
): Promise<number> {
  const buf = await fs.readFile(filePath);
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return 0;
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  if (rows.length === 0) return 0;

  const headers = Object.keys(rows[0]);
  const mapping = detectColumnMapping(headers);
  let created = 0;
  for (const row of rows) {
    if (await persistMappedRow(shopDomain, supplierId, row, mapping)) {
      created++;
    }
  }
  return created;
}

async function importCsvStream(
  shopDomain: string,
  supplierId: string,
  filePath: string,
): Promise<number> {
  const parser = createReadStream(filePath).pipe(
    parseCsvStream({ columns: true, skip_empty_lines: true, trim: true }),
  );

  let mapping: Record<string, string> | null = null;
  let created = 0;
  for await (const record of parser) {
    const row = record as Record<string, unknown>;
    if (!mapping) mapping = detectColumnMapping(Object.keys(row));
    if (await persistMappedRow(shopDomain, supplierId, row, mapping)) {
      created++;
    }
  }
  return created;
}

async function persistMappedRow(
  shopDomain: string,
  supplierId: string,
  row: Record<string, unknown>,
  mapping: Record<string, string>,
): Promise<boolean> {
  const fields = applyMappingToRow(row, mapping);
  if (!fields) return false;

  await createProduct(shopDomain, {
    supplierId,
    title: fields.title,
    sku: fields.sku,
    cost: fields.cost,
    msrp: fields.msrp,
    mapPrice: fields.mapPrice,
    rawSource: JSON.stringify(row),
  });
  return true;
}

function applyMappingToRow(
  row: Record<string, unknown>,
  mapping: Record<string, string>,
): MappedProductFields | null {
  const out: Partial<Record<keyof MappedProductFields, string>> = {};
  for (const [header, field] of Object.entries(mapping)) {
    const raw = row[header];
    if (raw === undefined || raw === null || raw === "") continue;
    out[field as keyof MappedProductFields] = String(raw).trim();
  }
  if (!out.title || !out.sku) return null;
  return {
    title: out.title,
    sku: out.sku,
    cost: out.cost,
    msrp: out.msrp,
    mapPrice: out.mapPrice,
  };
}

// ─── URL mode ───

async function processUrlScrape(
  shopDomain: string,
  supplierId: string,
  scrapeUrl: string,
): Promise<number> {
  if (!scrapeUrl) return 0;

  let html = await getCachedScrape(scrapeUrl);
  if (!html) {
    html = await fetchPageHtml(scrapeUrl);
    if (html) await cacheScrape(scrapeUrl, html);
  }
  if (!html) return 0;

  const products = extractProductsFromHtml(html);
  let created = 0;
  for (const product of products) {
    await createProduct(shopDomain, {
      supplierId,
      title: product.title,
      sku: product.sku,
      cost: product.cost,
      msrp: product.msrp,
      mapPrice: product.mapPrice,
      rawSource: JSON.stringify(product.raw),
    });
    created++;
  }
  return created;
}

async function fetchPageHtml(url: string): Promise<string | null> {
  let html: string | null = null;
  if (shouldUseBrowser(url)) {
    const crawler = new PlaywrightCrawler({
      ...CRAWLEE_DEFAULTS,
      requestHandler: async ({ page }) => {
        html = await page.content();
      },
      failedRequestHandler: ({ request }) => {
        console.warn({ url: request.url }, "Catalog scrape: page fetch failed");
      },
    });
    await crawler.run([url]);
  } else {
    const crawler = new CheerioCrawler({
      ...CRAWLEE_DEFAULTS,
      requestHandler: async ({ body }) => {
        html = typeof body === "string" ? body : Buffer.from(body).toString("utf8");
      },
      failedRequestHandler: ({ request }) => {
        console.warn({ url: request.url }, "Catalog scrape: page fetch failed");
      },
    });
    await crawler.run([url]);
  }
  return html;
}

function extractProductsFromHtml(html: string): ScrapedProduct[] {
  const $ = cheerio.load(html);
  const products: ScrapedProduct[] = [];
  const seenSkus = new Set<string>();

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
      const item = readJsonLdProduct(node);
      if (item && item.sku && !seenSkus.has(item.sku)) {
        seenSkus.add(item.sku);
        products.push(item);
        continue;
      }
      if (node && typeof node === "object") {
        const obj = node as Record<string, unknown>;
        if (obj["@type"] === "ItemList" && Array.isArray(obj.itemListElement)) {
          for (const e of obj.itemListElement) {
            if (e && typeof e === "object" && "item" in e) {
              queue.push((e as { item: unknown }).item);
            } else {
              queue.push(e);
            }
          }
        }
        const graph = obj["@graph"];
        if (Array.isArray(graph)) queue.push(...graph);
      }
    }
  });

  return products;
}

function readJsonLdProduct(node: unknown): ScrapedProduct | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  if (obj["@type"] !== "Product") return null;

  const title = typeof obj.name === "string" ? obj.name.trim() : "";
  const sku = typeof obj.sku === "string"
    ? obj.sku.trim()
    : typeof obj.mpn === "string"
      ? obj.mpn.trim()
      : "";
  if (!title || !sku) return null;

  const offer = Array.isArray(obj.offers)
    ? (obj.offers[0] as Record<string, unknown> | undefined)
    : (obj.offers as Record<string, unknown> | undefined);
  const cost = offer?.price !== undefined ? String(offer.price) : undefined;

  return { title, sku, cost, raw: obj };
}
