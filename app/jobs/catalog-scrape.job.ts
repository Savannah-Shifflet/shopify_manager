import type { Job } from "bullmq";
import type { CatalogScrapePayload } from "./queues";

/**
 * Catalog scrape job
 * Scrapes a supplier product catalog page or processes an uploaded file (CSV/Excel).
 * Uses Crawlee for web scraping, csv-parse + xlsx for file parsing.
 */
export async function processCatalogScrape(job: Job<CatalogScrapePayload>) {
  const { shopDomain, supplierId, scrapeUrl, mode, fileKey } = job.data;

  console.info({ shopDomain, supplierId, mode }, "Starting catalog scrape");

  if (mode === "file") {
    // TODO: parse uploaded CSV/Excel file
    // 1. Retrieve file from temp storage (fileKey)
    // 2. Detect file type (CSV vs Excel)
    // 3. Parse with csv-parse or xlsx
    // 4. Run column mapping (fuzzy match against known field names)
    // 5. Present column mapping results for merchant review (store in DB, UI polls)
    // 6. After merchant confirms: create Product records with rawSource preserved
    void fileKey;
  } else {
    // TODO: web scrape
    // 1. Check Redis scrapeCache (24h TTL) to avoid re-fetching
    // 2. Use shouldUseBrowser() heuristic → PlaywrightCrawler or CheerioCrawler
    // 3. Navigate pagination, extract product data
    // 4. Create Product records with rawSource preserved
    void scrapeUrl;
  }

  await job.updateProgress(100);
}
