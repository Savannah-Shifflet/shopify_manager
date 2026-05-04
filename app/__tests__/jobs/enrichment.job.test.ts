import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Job } from "bullmq";
import type { EnrichmentPayload } from "~/jobs/queues";

vi.mock("~/services/enrichment.service", () => ({
  enrichProduct: vi.fn(),
}));

import { enrichProduct } from "~/services/enrichment.service";
import { processEnrichment } from "~/jobs/enrichment.job";

const shopDomain = "test-shop.myshopify.com";

function makeJob(payload: EnrichmentPayload): Job<EnrichmentPayload> {
  return {
    id: "job-1",
    data: payload,
    updateProgress: vi.fn(),
  } as unknown as Job<EnrichmentPayload>;
}

describe("processEnrichment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls enrichProduct for each productId", async () => {
    (enrichProduct as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const job = makeJob({
      shopDomain,
      productIds: ["p1", "p2", "p3"],
      priority: "single",
    });

    await processEnrichment(job);

    expect(enrichProduct).toHaveBeenCalledTimes(3);
    expect(enrichProduct).toHaveBeenNthCalledWith(
      1,
      shopDomain,
      "p1",
      "single",
    );
    expect(enrichProduct).toHaveBeenNthCalledWith(
      2,
      shopDomain,
      "p2",
      "single",
    );
    expect(enrichProduct).toHaveBeenNthCalledWith(
      3,
      shopDomain,
      "p3",
      "single",
    );
  });

  it("forwards the priority parameter (batch)", async () => {
    (enrichProduct as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    await processEnrichment(
      makeJob({ shopDomain, productIds: ["p1"], priority: "batch" }),
    );
    expect(enrichProduct).toHaveBeenCalledWith(shopDomain, "p1", "batch");
  });

  it("reports progress proportional to completed items", async () => {
    (enrichProduct as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const job = makeJob({
      shopDomain,
      productIds: ["p1", "p2", "p3", "p4"],
      priority: "batch",
    });

    await processEnrichment(job);

    const updateProgress = job.updateProgress as ReturnType<typeof vi.fn>;
    expect(updateProgress).toHaveBeenCalledTimes(4);
    expect(updateProgress).toHaveBeenNthCalledWith(1, 25);
    expect(updateProgress).toHaveBeenNthCalledWith(2, 50);
    expect(updateProgress).toHaveBeenNthCalledWith(3, 75);
    expect(updateProgress).toHaveBeenNthCalledWith(4, 100);
  });

  it("continues when one product errors and does not throw if at least one succeeds", async () => {
    (enrichProduct as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);

    const job = makeJob({
      shopDomain,
      productIds: ["p1", "p2", "p3"],
      priority: "single",
    });

    await expect(processEnrichment(job)).resolves.toBeUndefined();
    expect(enrichProduct).toHaveBeenCalledTimes(3);
    expect(job.updateProgress).toHaveBeenCalledTimes(3);
  });

  it("throws when every product fails", async () => {
    (enrichProduct as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("all-fail"),
    );

    const job = makeJob({
      shopDomain,
      productIds: ["p1", "p2"],
      priority: "single",
    });

    await expect(processEnrichment(job)).rejects.toThrow(/all-fail/);
  });
});
