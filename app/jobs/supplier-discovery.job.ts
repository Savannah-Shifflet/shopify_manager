import type { Job } from "bullmq";
import type { SupplierDiscoveryPayload } from "./queues";

/**
 * Supplier discovery job
 * Scrapes directories, trade sites, and brand dealer pages to surface new leads.
 * Uses Crawlee (PlaywrightCrawler for JS-rendered pages, CheerioCrawler for static).
 */
export async function processSupplierDiscovery(job: Job<SupplierDiscoveryPayload>) {
  const { shopDomain, keywords = [], triggeredBy } = job.data;

  console.info({ shopDomain, keywords, triggeredBy }, "Starting supplier discovery");

  // TODO: implement discovery pipeline
  // 1. Build search queries from shopDomain's niche config + keywords
  // 2. Run CheerioCrawler against B2B directories (Thomas Net, industry-specific)
  // 3. Run PlaywrightCrawler for JS-rendered brand "become a dealer" pages
  // 4. Parse results → extract: name, website, contact info, categories
  // 5. Deduplicate against existing Supplier records (by website domain)
  // 6. Create LEAD records for new suppliers
  // 7. Notify merchant if triggeredBy === "schedule" and new leads found

  await job.updateProgress(100);
}
