import type { Job } from "bullmq";
import type { PriceMonitorPayload } from "./queues";

/**
 * Price monitor job
 * Scrapes a supplier's product page for price changes.
 * Detects changes via SHA-256 hash comparison and creates PriceAlert records.
 */
export async function processPriceMonitor(job: Job<PriceMonitorPayload>) {
  const { shopDomain, supplierId, scrapeUrl } = job.data;

  console.info({ shopDomain, supplierId }, "Starting price monitor");

  // TODO: implement price monitoring pipeline
  // 1. Fetch PriceMonitorConfig for supplierId
  // 2. Check Redis scrapeCache (24h TTL) for previous scrape
  // 3. Scrape current prices (CheerioCrawler preferred for speed)
  // 4. Compare with products' last known prices (hash comparison)
  // 5. For each changed product:
  //    a. Create PriceHistory record
  //    b. Calculate new retail price using PricingRule (fetchApplicableRule)
  //    c. Check MAP enforcement (mapPrice)
  //    d. Create PriceAlert with status "pending" (or "auto_applied" if rule allows)
  //    e. If auto-apply: enqueue shopify-sync job
  //    f. Notify merchant
  // 6. Update lastScrapedAt on PriceMonitorConfig

  await job.updateProgress(100);
}
