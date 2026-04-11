import type { Product } from "@prisma/client";

interface BrandVoice {
  tone?: string[]; // e.g. ["technical", "approachable", "confident"]
  examples?: string[]; // 1–3 example descriptions (few-shot)
}

interface TemplateSection {
  tag: string; // e.g. "h2", "ul", "table"
  title: string; // e.g. "Key Features"
  hint: string; // e.g. "3-5 bullet points"
  required: boolean;
}

interface SystemPromptConfig {
  niche: string;
  brandVoice: BrandVoice;
  contentTemplate: TemplateSection[];
}

/**
 * Builds the system prompt injected with merchant configuration.
 * All AI enrichment calls use this as context.
 */
export function buildSystemPrompt(config: SystemPromptConfig): string {
  const toneList = config.brandVoice.tone?.length
    ? config.brandVoice.tone.join(", ")
    : "professional and informative";

  const templateInstructions =
    config.contentTemplate.length > 0
      ? `\n\nContent template sections (generate in this order):\n${config.contentTemplate
          .map(
            (s) =>
              `- ${s.title} (${s.tag}): ${s.hint}${s.required ? " [required]" : " [optional]"}`,
          )
          .join("\n")}`
      : "";

  const examplesSection = config.brandVoice.examples?.length
    ? `\n\nExample product descriptions (few-shot references — match this style and tone):\n${config.brandVoice.examples
        .map((e, i) => `Example ${i + 1}:\n${e}`)
        .join("\n\n")}`
    : "";

  return `You are a product content specialist for an authorized reseller in the ${config.niche || "high-ticket retail"} niche.

Your task is to generate compelling, accurate product descriptions for supplier products.

Tone: ${toneList}

Rules:
- Write for the end customer (the merchant's shoppers), not for the supplier
- Never fabricate specifications — only include details from the provided product data
- Structure content as HTML that will be stored in Shopify metafields (not body_html)
- Respond ONLY with valid JSON matching the required schema — no prose before or after${templateInstructions}${examplesSection}`;
}

/**
 * Builds the user prompt with the product data to enrich.
 */
export function buildProductPrompt(product: Product): string {
  const rawSource = product.rawSource
    ? JSON.stringify(JSON.parse(product.rawSource as string), null, 2)
    : "{}";

  return `Generate product content for the following item. Return valid JSON only.

Product Data:
Title: ${product.title}
SKU: ${product.sku}
Cost: ${product.cost ?? "not provided"}
MSRP: ${product.msrp ?? "not provided"}
MAP: ${product.mapPrice ?? "not provided"}

Raw source data (from supplier import):
${rawSource}

Required JSON response format:
{
  "title": "string — compelling product title (50-80 chars)",
  "description": "string — full HTML description with template sections",
  "tags": ["string", "..."],
  "attributes": {
    "key": "value"
  }
}`;
}
