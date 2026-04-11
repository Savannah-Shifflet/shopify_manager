import db from "~/db.server";
import { supplierDiscoveryQueue } from "~/jobs/queues";

/**
 * Triggers an on-demand supplier discovery job for a shop.
 * Actual scraping logic lives in supplier-discovery.job.ts.
 */
export async function triggerSupplierDiscovery(
  shopDomain: string,
  options: { keywords?: string[] } = {}
) {
  const job = await supplierDiscoveryQueue.add(
    "on-demand-discovery",
    {
      shopDomain,
      keywords: options.keywords ?? [],
      triggeredBy: "manual",
    },
    { priority: 1 } // manual triggers get higher priority than scheduled
  );

  return { jobId: job.id };
}

/**
 * Schedules the repeatable discovery job for a shop.
 * Should be called once at install / when merchant enables discovery.
 */
export async function scheduleDiscovery(shopDomain: string) {
  await supplierDiscoveryQueue.add(
    "scheduled-discovery",
    { shopDomain, triggeredBy: "schedule" },
    {
      repeat: { pattern: "0 8 * * *" }, // 8 AM UTC daily
      jobId: `discovery:${shopDomain}`, // stable ID for deduplication
    }
  );
}

/**
 * Removes the repeatable discovery schedule for a shop.
 */
export async function cancelDiscoverySchedule(shopDomain: string) {
  await supplierDiscoveryQueue.removeRepeatableByKey(
    `discovery:${shopDomain}`
  );
}
