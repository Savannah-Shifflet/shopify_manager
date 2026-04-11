import db from "~/db.server";
import { updateProduct } from "~/services/supplier.service";
import { shopifySyncQueue } from "~/jobs/queues";

/**
 * ACCEPTANCE_MAP — single source of truth for how AI staging fields
 * are promoted to live fields on acceptance.
 *
 * Structure: { stagingField: destinationField }
 * The destination field tells the sync service where to write the value
 * (Shopify metafield namespace:key, or Shopify product field name).
 */
export const ACCEPTANCE_MAP = {
  aiTitle: { shopifyField: "title" },
  aiDescription: {
    shopifyField: null, // body_html is for plain prose only
    metafield: { namespace: "custom", key: "description_html" },
  },
  aiTags: { shopifyField: "tags" },
  aiAttributes: {
    shopifyField: null,
    metafield: { namespace: "custom", key: "attributes" },
  },
} as const;

/**
 * Applies accepted AI staging fields to live product data.
 * This is the ONLY place staging → live promotion happens.
 * After calling this, the product is queued for Shopify sync.
 */
export async function applyAiAcceptance(
  shopDomain: string,
  productId: string
): Promise<void> {
  const product = await db.product.findFirstOrThrow({
    where: { id: productId, shopDomain },
  });

  // Promote staging fields to the accepted columns
  // (actual Shopify write happens in the sync job)
  await updateProduct(shopDomain, productId, {
    // After acceptance, staging fields remain populated but syncStatus goes OUT_OF_SYNC
    // signaling the sync job to push the accepted values
    syncStatus: "OUT_OF_SYNC",
  });

  // Enqueue Shopify sync to push accepted content as metafields
  await shopifySyncQueue.add("push-accepted-content", {
    shopDomain,
    productId,
    mode: "push",
  });
}

/**
 * Rejects all AI staging fields for a product.
 * Clears staging data and resets enrichStatus to NOT_STARTED.
 */
export async function rejectAiContent(
  shopDomain: string,
  productId: string
): Promise<void> {
  await updateProduct(shopDomain, productId, {
    aiTitle: null,
    aiDescription: null,
    aiTags: JSON.stringify([]),
    aiAttributes: null,
    enrichStatus: "NOT_STARTED",
  });
}
