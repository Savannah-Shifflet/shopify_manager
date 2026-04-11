import type { Job } from "bullmq";
import type { ShopifySyncPayload } from "./queues";

/**
 * Shopify sync job
 * Pushes products to Shopify via GraphQL Admin API.
 * Uses SHA-256 hash to skip unchanged products (idempotent).
 * Images are processed with Sharp before upload via stagedUploadsCreate.
 */
export async function processShopifySync(job: Job<ShopifySyncPayload>) {
  const { shopDomain, productId, productShopifyId, mode = "push" } = job.data;

  console.info(
    { shopDomain, productId, productShopifyId, mode },
    "Starting Shopify sync",
  );

  // TODO: implement sync pipeline
  // For "push" mode (productId provided):
  // 1. Fetch Product from DB
  // 2. Compute SHA-256 hash of payload
  // 3. Compare with product.syncHash — skip if unchanged
  // 4. Update syncStatus → PENDING
  // 5. Upload images via stagedUploadsCreate + Sharp optimization
  // 6. Call productCreate or productUpdate GraphQL mutation
  // 7. Write metafields (structured content → custom.* namespace)
  // 8. Update syncStatus → SYNCED, syncHash → new hash
  //
  // For "delete" mode (productShopifyId provided):
  // 1. Find product by shopifyId
  // 2. Mark as deleted / update syncStatus

  await job.updateProgress(100);
}
