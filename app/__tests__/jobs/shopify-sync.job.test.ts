import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Job } from "bullmq";
import type { ShopifySyncPayload } from "~/jobs/queues";

vi.mock("~/services/supplier.service", () => ({
  getProductById: vi.fn(),
  getProductByShopifyId: vi.fn(),
  updateProduct: vi.fn(),
}));

vi.mock("~/services/metafield.service", () => ({
  setMetafields: vi.fn(),
}));

vi.mock("~/shopify.server", () => ({
  unauthenticated: { admin: vi.fn() },
}));

import {
  getProductById,
  getProductByShopifyId,
  updateProduct,
} from "~/services/supplier.service";
import { setMetafields } from "~/services/metafield.service";
import { unauthenticated } from "~/shopify.server";
import { processShopifySync } from "~/jobs/shopify-sync.job";

const shopDomain = "test-shop.myshopify.com";

function makeJob(payload: ShopifySyncPayload): Job<ShopifySyncPayload> {
  return {
    id: "job-1",
    data: payload,
    updateProgress: vi.fn(),
  } as unknown as Job<ShopifySyncPayload>;
}

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "prod-1",
    shopDomain,
    title: "Original",
    sku: "SKU-1",
    aiTitle: null,
    aiDescription: null,
    aiTags: "[]",
    aiAttributes: null,
    shopifyId: null,
    syncStatus: "NEVER_SYNCED",
    syncHash: null,
    ...overrides,
  };
}

function mockGraphqlResponse(body: unknown) {
  return { json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

describe("processShopifySync — push mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new product when shopifyId is null", async () => {
    (getProductById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeProduct({
        aiTitle: "AI Title",
        aiDescription: "<p>desc</p>",
        aiTags: JSON.stringify(["tag1", "tag2"]),
      }),
    );
    const graphql = vi.fn().mockResolvedValueOnce(
      mockGraphqlResponse({
        data: {
          productCreate: {
            product: { id: "gid://shopify/Product/123" },
            userErrors: [],
          },
        },
      }),
    );
    (unauthenticated.admin as ReturnType<typeof vi.fn>).mockResolvedValue({
      admin: { graphql },
    });

    await processShopifySync(
      makeJob({ shopDomain, productId: "prod-1", mode: "push" }),
    );

    expect(graphql).toHaveBeenCalledTimes(1);
    const [, opts] = graphql.mock.calls[0];
    expect(opts.variables.input.title).toBe("AI Title");
    expect(opts.variables.input.tags).toEqual(["tag1", "tag2"]);
    expect(opts.variables.input.descriptionHtml).toBe("<p>desc</p>");
    expect(opts.variables.input.id).toBeUndefined();

    expect(setMetafields).toHaveBeenCalledTimes(1);
    expect(updateProduct).toHaveBeenCalledWith(shopDomain, "prod-1", {
      shopifyId: "gid://shopify/Product/123",
      syncStatus: "SYNCED",
      syncHash: expect.any(String),
    });
  });

  it("calls productUpdate when shopifyId already exists", async () => {
    (getProductById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeProduct({
        shopifyId: "gid://shopify/Product/999",
        aiTitle: "Updated",
      }),
    );
    const graphql = vi.fn().mockResolvedValue(
      mockGraphqlResponse({
        data: {
          productUpdate: {
            product: { id: "gid://shopify/Product/999" },
            userErrors: [],
          },
        },
      }),
    );
    (unauthenticated.admin as ReturnType<typeof vi.fn>).mockResolvedValue({
      admin: { graphql },
    });

    await processShopifySync(
      makeJob({ shopDomain, productId: "prod-1", mode: "push" }),
    );

    const [, opts] = graphql.mock.calls[0];
    expect(opts.variables.input.id).toBe("gid://shopify/Product/999");
    expect(opts.variables.input.title).toBe("Updated");
  });

  it("skips work when syncHash matches and status is SYNCED", async () => {
    // Compute the hash the job would compute for this payload.
    const product = makeProduct({
      title: "Same",
      aiTitle: null,
      aiDescription: null,
      aiTags: "[]",
      aiAttributes: null,
      syncStatus: "SYNCED",
    });
    // Pre-run with a different hash to discover what the job computes.
    (getProductById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeProduct({ ...product, syncHash: "wrong" }),
    );
    const graphql = vi.fn().mockResolvedValue(
      mockGraphqlResponse({
        data: {
          productCreate: {
            product: { id: "gid://shopify/Product/1" },
            userErrors: [],
          },
        },
      }),
    );
    (unauthenticated.admin as ReturnType<typeof vi.fn>).mockResolvedValue({
      admin: { graphql },
    });
    await processShopifySync(
      makeJob({ shopDomain, productId: "prod-1", mode: "push" }),
    );

    const computedHash = (
      (updateProduct as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[2].syncStatus === "SYNCED",
      ) as unknown[]
    )?.[2] as { syncHash: string };

    vi.clearAllMocks();

    // Now run with the matching hash and SYNCED status — should skip.
    (getProductById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeProduct({ ...product, syncHash: computedHash.syncHash }),
    );

    await processShopifySync(
      makeJob({ shopDomain, productId: "prod-1", mode: "push" }),
    );

    expect(unauthenticated.admin).not.toHaveBeenCalled();
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("marks syncStatus FAILED and rethrows when GraphQL returns userErrors", async () => {
    (getProductById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeProduct({ aiTitle: "X" }),
    );
    const graphql = vi.fn().mockResolvedValue(
      mockGraphqlResponse({
        data: {
          productCreate: {
            product: null,
            userErrors: [{ field: ["title"], message: "bad title" }],
          },
        },
      }),
    );
    (unauthenticated.admin as ReturnType<typeof vi.fn>).mockResolvedValue({
      admin: { graphql },
    });

    await expect(
      processShopifySync(
        makeJob({ shopDomain, productId: "prod-1", mode: "push" }),
      ),
    ).rejects.toThrow(/userErrors/);

    expect(updateProduct).toHaveBeenCalledWith(shopDomain, "prod-1", {
      syncStatus: "FAILED",
    });
  });

  it("throws if push mode is missing productId", async () => {
    await expect(
      processShopifySync(makeJob({ shopDomain, mode: "push" })),
    ).rejects.toThrow(/productId/);
  });
});

describe("processShopifySync — delete mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears shopifyId and marks OUT_OF_SYNC when local product is found", async () => {
    (getProductByShopifyId as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeProduct({ id: "prod-9", shopifyId: "gid://shopify/Product/777" }),
    );

    await processShopifySync(
      makeJob({
        shopDomain,
        productShopifyId: "gid://shopify/Product/777",
        mode: "delete",
      }),
    );

    expect(updateProduct).toHaveBeenCalledWith(shopDomain, "prod-9", {
      shopifyId: null,
      syncStatus: "OUT_OF_SYNC",
    });
  });

  it("is a no-op when no local product matches the deleted Shopify id", async () => {
    (getProductByShopifyId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await processShopifySync(
      makeJob({
        shopDomain,
        productShopifyId: "gid://shopify/Product/missing",
        mode: "delete",
      }),
    );

    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("throws if delete mode is missing productShopifyId", async () => {
    await expect(
      processShopifySync(makeJob({ shopDomain, mode: "delete" })),
    ).rejects.toThrow(/productShopifyId/);
  });
});
