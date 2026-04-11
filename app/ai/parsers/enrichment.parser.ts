import { z } from "zod";

/**
 * Zod schema for validating AI enrichment output.
 * Every AI call result is validated before storing — never trust raw AI output shape.
 */
export const AiEnrichmentOutputSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.string()).optional(),
});

export type AiEnrichmentOutput = z.infer<typeof AiEnrichmentOutputSchema>;

/**
 * Extracts the JSON block from Claude's response text.
 * Handles responses that may contain explanation text before/after the JSON.
 */
export function extractJson(text: string): string {
  // First, try to find a ```json ... ``` code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  // Fall back to finding the outermost { ... } or [ ... ] block
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  // Return the full text and let JSON.parse throw a meaningful error
  return text;
}
