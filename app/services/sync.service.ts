import db from "~/db.server";
import { shopifySyncQueue } from "~/jobs/queues";

/**
 * Enqueues a product push to Shopify.
 * The worker performs the actual Shopify write.
 */
export async function queueProductSync(shopDomain: string, productId: string) {
  return shopifySyncQueue.add(
    "push-product",
    { shopDomain, productId, mode: "push" },
    { priority: 1 },
  );
}

/**
 * Enqueues a bulk sync of all out-of-sync products for a shop.
 */
export async function queueBulkSync(shopDomain: string) {
  const products = await db.product.findMany({
    where: {
      shopDomain,
      syncStatus: { in: ["NEVER_SYNCED", "OUT_OF_SYNC", "FAILED"] },
    },
    select: { id: true },
  });

  const jobs = products.map((p) => ({
    name: "bulk-push",
    data: { shopDomain, productId: p.id, mode: "push" as const },
    opts: { priority: 2 },
  }));

  await shopifySyncQueue.addBulk(jobs);
  return { queued: jobs.length };
}

/**
 * Schedules nightly reconciliation — catches products that missed webhook deltas.
 */
export async function scheduleNightlyReconciliation(shopDomain: string) {
  await shopifySyncQueue.add(
    "nightly-reconcile",
    { shopDomain, mode: "push" },
    {
      repeat: { pattern: "0 2 * * *" }, // 2 AM UTC
      jobId: `reconcile:${shopDomain}`,
    },
  );
}
