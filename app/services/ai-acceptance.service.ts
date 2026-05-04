import db from "~/db.server";
import { updateProduct } from "~/services/supplier.service";
import { shopifySyncQueue } from "~/jobs/queues";

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

export async function applyAiAcceptance(
  shopDomain: string,
  productId: string,
): Promise<void> {
  await db.product.findFirstOrThrow({
    where: { id: productId, shopDomain },
  });

  await updateProduct(shopDomain, productId, {
    syncStatus: "OUT_OF_SYNC",
  });

  await shopifySyncQueue.add("push-accepted-content", {
    shopDomain,
    productId,
    mode: "push",
  });
}

export async function rejectAiContent(
  shopDomain: string,
  productId: string,
): Promise<void> {
  await updateProduct(shopDomain, productId, {
    aiTitle: null,
    aiDescription: null,
    aiTags: JSON.stringify([]),
    aiAttributes: null,
    enrichStatus: "NOT_STARTED",
  });
}
