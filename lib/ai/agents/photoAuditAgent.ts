import { z } from "zod";
import { AIProvider } from "../provider";
import { parseAIJson } from "../parseJson";

export const PHOTO_ISSUES = [
  "background",
  "lighting",
  "framing",
  "attire",
  "resolution",
] as const;

export const PhotoAuditSchema = z.object({
  score: z.number().int().min(0).max(100),
  critique: z.string().min(1),
  issues: z.array(z.enum(PHOTO_ISSUES)),
});

export type PhotoAudit = z.infer<typeof PhotoAuditSchema>;

const SYSTEM_PROMPT = `You are reviewing a professional headshot intended for a LinkedIn profile. Assess: framing (head/shoulders visible, centered), background (plain/uncluttered vs. distracting), lighting (even, not harsh shadows or backlit), attire (business-appropriate for the given industry), and image quality (resolution, blur). Do not comment on the person's appearance, body, or attractiveness — only the photographic/technical and professional-context factors above. Never use a literal double-quote character inside a string value — it breaks the JSON. Output strict JSON only, no preamble, no markdown fence: {"score": number, "critique": string, "issues": string[]} where issues is drawn only from ["background","lighting","framing","attire","resolution"].`;

/**
 * `imageBase64` is base64-encoded image bytes (no data URL prefix).
 * This function only scores and diagnoses — it never generates or
 * edits pixels. See lib/photo/correct.ts for the separate,
 * deterministic correction step, and the design note in the dev plan
 * on why generative face edits are out of scope.
 */
export async function auditPhoto(
  provider: AIProvider,
  image: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" },
  industry: string
): Promise<PhotoAudit> {
  const prompt = `Industry: ${industry}\n\nReview the attached headshot image.`;

  const raw = await provider.generate(prompt, {
    system: SYSTEM_PROMPT,
    maxTokens: 500,
    temperature: 0.2,
    images: [image],
  });

  return parseAIJson(raw, PhotoAuditSchema);
}

/** Score at or above this is left alone — "looks good, no changes needed". */
export const PHOTO_SCORE_THRESHOLD = 70;
