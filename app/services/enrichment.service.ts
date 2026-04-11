import Anthropic from "@anthropic-ai/sdk";
import db from "~/db.server";
import { updateProduct, getMerchantConfig } from "~/services/supplier.service";
import { buildSystemPrompt, buildProductPrompt } from "~/ai/prompts/enrichment.prompt";
import { AiEnrichmentOutputSchema, extractJson } from "~/ai/parsers/enrichment.parser";
import pino from "pino";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

const MODELS = {
  quality: "claude-sonnet-4-5",
  batch: "claude-haiku-4-5-20251001",
} as const;

/**
 * Enriches a single product with AI-generated content.
 * Output lands in ai_* staging fields — never written to Shopify directly.
 */
export async function enrichProduct(
  shopDomain: string,
  productId: string,
  priority: "single" | "batch" = "single"
): Promise<void> {
  const product = await db.product.findFirstOrThrow({
    where: { id: productId, shopDomain },
  });
  const config = await getMerchantConfig(shopDomain);

  await updateProduct(shopDomain, productId, { enrichStatus: "RUNNING" });

  try {
    const model = priority === "single" ? MODELS.quality : MODELS.batch;

    const systemPrompt = buildSystemPrompt({
      niche: config?.niche ?? "",
      brandVoice: config?.brandVoice ? JSON.parse(config.brandVoice as string) : {},
      contentTemplate: config?.contentTemplate
        ? JSON.parse(config.contentTemplate as string)
        : [],
    });
    const userPrompt = buildProductPrompt(product);

    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const parsed = AiEnrichmentOutputSchema.safeParse(
      JSON.parse(extractJson(rawText))
    );

    if (!parsed.success) {
      log.warn({ shopDomain, productId, errors: parsed.error.flatten() }, "AI output parse failed");
      await updateProduct(shopDomain, productId, { enrichStatus: "FAILED" });
      return;
    }

    // Log token usage for cost tracking
    log.info(
      {
        shopDomain,
        productId,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model,
      },
      "AI enrichment token usage"
    );

    await updateProduct(shopDomain, productId, {
      aiTitle: parsed.data.title,
      aiDescription: parsed.data.description,
      aiTags: JSON.stringify(parsed.data.tags ?? []),
      aiAttributes: parsed.data.attributes ? JSON.stringify(parsed.data.attributes) : null,
      enrichStatus: "DONE",
    });
  } catch (err) {
    log.error({ shopDomain, productId, err }, "AI enrichment failed");
    await updateProduct(shopDomain, productId, { enrichStatus: "FAILED" });
    throw err;
  }
}
