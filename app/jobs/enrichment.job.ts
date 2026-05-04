import type { Job } from "bullmq";
import pino from "pino";
import { env } from "~/env.server";
import { enrichProduct } from "~/services/enrichment.service";
import type { EnrichmentPayload } from "./queues";

const log = pino({ level: env.LOG_LEVEL });

/**
 * AI enrichment job
 * Iterates productIds and delegates to enrichProduct for the full Claude pipeline
 * (model selection, prompt build, Zod parse, token logging, staging-field writes).
 * Output always lands in ai_* staging fields — never written to Shopify directly.
 */
export async function processEnrichment(job: Job<EnrichmentPayload>) {
  const { shopDomain, productIds, priority } = job.data;

  log.info(
    { shopDomain, productCount: productIds.length, priority, jobId: job.id },
    "Starting enrichment",
  );

  const total = productIds.length;
  let completed = 0;
  const failed: Array<{ productId: string; error: string }> = [];

  for (const productId of productIds) {
    try {
      await enrichProduct(shopDomain, productId, priority);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ productId, error: message });
      log.error(
        { shopDomain, productId, jobId: job.id, err: message },
        "Enrichment failed for product",
      );
    } finally {
      completed += 1;
      await job.updateProgress(Math.round((completed / total) * 100));
    }
  }

  log.info(
    {
      shopDomain,
      jobId: job.id,
      total,
      succeeded: total - failed.length,
      failed: failed.length,
    },
    "Enrichment job complete",
  );

  if (failed.length > 0 && failed.length === total) {
    throw new Error(
      `All ${total} enrichment items failed; last: ${failed[failed.length - 1].error}`,
    );
  }
}
