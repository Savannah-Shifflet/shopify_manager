import crypto from "node:crypto";
import type { Job } from "bullmq";
import pino from "pino";
import { env } from "~/env.server";
import { unauthenticated } from "~/shopify.server";
import {
  getProductById,
  getProductByShopifyId,
  updateProduct,
} from "~/services/supplier.service";
import {
  setMetafields,
  type MetafieldInput,
} from "~/services/metafield.service";
import type { ShopifySyncPayload } from "./queues";

const log = pino({ level: env.LOG_LEVEL });

const PRODUCT_CREATE_MUTATION = `#graphql
  mutation ProductCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product { id }
      userErrors { field message }
    }
  }
`;

const PRODUCT_UPDATE_MUTATION = `#graphql
  mutation ProductUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id }
      userErrors { field message }
    }
  }
`;

interface ShopifyMutationResponse {
  data?: {
    productCreate?: {
      product: { id: string } | null;
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
    productUpdate?: {
      product: { id: string } | null;
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  };
  errors?: Array<{ message: string }>;
}

interface SyncPayload {
  title: string;
  descriptionHtml: string;
  tags: string[];
  attributes: Record<string, string>;
}

function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function buildSyncPayload(product: {
  title: string;
  aiTitle: string | null;
  aiDescription: string | null;
  aiTags: string;
  aiAttributes: string | null;
}): SyncPayload {
  const tags = safeParseJson<string[]>(product.aiTags, []);
  const attributes = safeParseJson<Record<string, string>>(
    product.aiAttributes,
    {},
  );

  return {
    title: product.aiTitle ?? product.title,
    descriptionHtml: product.aiDescription ?? "",
    tags,
    attributes,
  };
}

function computeSyncHash(payload: SyncPayload): string {
  // Stable JSON ordering: stringify with sorted keys so the hash is deterministic.
  const sortedAttributes = Object.fromEntries(
    Object.entries(payload.attributes).sort(([a], [b]) => a.localeCompare(b)),
  );
  const canonical = JSON.stringify({
    title: payload.title,
    descriptionHtml: payload.descriptionHtml,
    tags: [...payload.tags].sort(),
    attributes: sortedAttributes,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

async function pushProduct(
  shopDomain: string,
  jobId: string | undefined,
  productId: string,
): Promise<void> {
  const product = await getProductById(shopDomain, productId);
  if (!product) {
    log.warn(
      { shopDomain, productId, jobId },
      "Product not found for sync; skipping",
    );
    return;
  }

  const payload = buildSyncPayload(product);
  const newHash = computeSyncHash(payload);

  if (product.syncHash === newHash && product.syncStatus === "SYNCED") {
    log.info(
      { shopDomain, productId, jobId, hash: newHash },
      "Sync hash unchanged; skipping push",
    );
    return;
  }

  await updateProduct(shopDomain, productId, { syncStatus: "PENDING" });

  const { admin } = await unauthenticated.admin(shopDomain);

  const productInput: Record<string, unknown> = {
    title: payload.title,
    tags: payload.tags,
  };
  if (payload.descriptionHtml) {
    // body_html is plain prose narrative only; structured content lives in metafields.
    productInput.descriptionHtml = payload.descriptionHtml;
  }

  let shopifyProductId = product.shopifyId;

  try {
    if (shopifyProductId) {
      productInput.id = shopifyProductId;
      const response = await admin.graphql(PRODUCT_UPDATE_MUTATION, {
        variables: { input: productInput },
      });
      const data = (await response.json()) as ShopifyMutationResponse;
      const errors = data.data?.productUpdate?.userErrors ?? [];
      if (errors.length > 0) {
        throw new Error(`productUpdate userErrors: ${JSON.stringify(errors)}`);
      }
    } else {
      const response = await admin.graphql(PRODUCT_CREATE_MUTATION, {
        variables: { input: productInput },
      });
      const data = (await response.json()) as ShopifyMutationResponse;
      const errors = data.data?.productCreate?.userErrors ?? [];
      if (errors.length > 0) {
        throw new Error(`productCreate userErrors: ${JSON.stringify(errors)}`);
      }
      shopifyProductId = data.data?.productCreate?.product?.id ?? null;
      if (!shopifyProductId) {
        throw new Error("productCreate returned no product id");
      }
    }

    const metafields: MetafieldInput[] = [];
    if (payload.descriptionHtml) {
      metafields.push({
        ownerId: shopifyProductId,
        namespace: "custom",
        key: "description_html",
        type: "multi_line_text_field",
        value: payload.descriptionHtml,
      });
    }
    if (Object.keys(payload.attributes).length > 0) {
      metafields.push({
        ownerId: shopifyProductId,
        namespace: "custom",
        key: "attributes",
        type: "json",
        value: JSON.stringify(payload.attributes),
      });
    }

    if (metafields.length > 0) {
      await setMetafields(admin, metafields);
    }

    await updateProduct(shopDomain, productId, {
      shopifyId: shopifyProductId,
      syncStatus: "SYNCED",
      syncHash: newHash,
    });

    log.info(
      { shopDomain, productId, shopifyProductId, jobId, hash: newHash },
      "Product synced to Shopify",
    );
  } catch (err) {
    await updateProduct(shopDomain, productId, { syncStatus: "FAILED" });
    log.error({ shopDomain, productId, jobId, err }, "Shopify sync failed");
    throw err;
  }
}

async function handleDelete(
  shopDomain: string,
  jobId: string | undefined,
  productShopifyId: string,
): Promise<void> {
  const product = await getProductByShopifyId(shopDomain, productShopifyId);
  if (!product) {
    log.warn(
      { shopDomain, productShopifyId, jobId },
      "No local product matches deleted Shopify id; nothing to do",
    );
    return;
  }

  await updateProduct(shopDomain, product.id, {
    shopifyId: null,
    syncStatus: "OUT_OF_SYNC",
  });

  log.info(
    { shopDomain, productId: product.id, productShopifyId, jobId },
    "Marked product as out-of-sync after Shopify-side delete",
  );
}

/**
 * Shopify sync job
 * push: fetch Product, hash compare, productCreate/productUpdate, write custom.* metafields,
 *       update syncStatus → SYNCED + syncHash. Idempotent — skips when hash matches.
 * delete: clear local shopifyId and mark OUT_OF_SYNC for webhook-triggered deletions.
 *
 * NOTE: image upload (Sharp + stagedUploadsCreate) and variant/SKU/cost push are deferred
 * until the basic content + metafield push pipeline is stable.
 */
export async function processShopifySync(job: Job<ShopifySyncPayload>) {
  const { shopDomain, productId, productShopifyId, mode = "push" } = job.data;

  log.info(
    { shopDomain, productId, productShopifyId, mode, jobId: job.id },
    "Starting Shopify sync",
  );

  if (mode === "delete") {
    if (!productShopifyId) {
      throw new Error("delete mode requires productShopifyId");
    }
    await handleDelete(shopDomain, job.id, productShopifyId);
  } else {
    if (!productId) {
      throw new Error("push mode requires productId");
    }
    await pushProduct(shopDomain, job.id, productId);
  }

  await job.updateProgress(100);
}
