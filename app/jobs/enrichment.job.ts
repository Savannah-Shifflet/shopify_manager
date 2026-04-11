import type { Job } from "bullmq";
import type { EnrichmentPayload } from "./queues";

/**
 * AI enrichment job
 * Calls Claude API to generate product titles, descriptions, tags, and attributes.
 * Output always lands in staging fields (ai_*) — never written directly to Shopify.
 */
export async function processEnrichment(job: Job<EnrichmentPayload>) {
  const { shopDomain, productIds, priority } = job.data;

  console.info({ shopDomain, productCount: productIds.length, priority }, "Starting enrichment");

  // TODO: implement enrichment pipeline
  // For each productId:
  // 1. Fetch product + merchant config (niche, brandVoice, contentTemplate)
  // 2. Update enrichStatus → RUNNING
  // 3. Build system prompt (buildSystemPrompt) + user prompt (buildProductPrompt)
  //    from app/ai/prompts/enrichment.prompt.ts
  // 4. Call Claude API:
  //    - priority "single" → claude-sonnet-4-5
  //    - priority "batch"  → claude-haiku-4-5-20251001
  // 5. Parse response with AiEnrichmentOutputSchema (Zod)
  // 6. Write to ai_title, ai_description, ai_tags, ai_attributes staging fields
  // 7. Update enrichStatus → DONE
  // 8. Log token usage: { shopDomain, productId, inputTokens, outputTokens }
  //
  // On error: update enrichStatus → FAILED, report to Sentry with { shopDomain }

  await job.updateProgress(100);
}
