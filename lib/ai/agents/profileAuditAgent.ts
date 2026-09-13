import { z } from "zod";
import { AIProvider } from "../provider";
import { parseAIJson } from "../parseJson";

export const ProfileAuditSectionSchema = z.object({
  section: z.enum(["headline", "about", "experience"]),
  score: z.number().int().min(0).max(100),
  critique: z.string().min(1),
  suggested_rewrite: z.string().min(1),
});

export const ProfileAuditSchema = z.object({
  sections: z.array(ProfileAuditSectionSchema).min(1),
});

export type ProfileAudit = z.infer<typeof ProfileAuditSchema>;

export interface ProfileAuditInput {
  profession: string;
  industry: string;
  skills: string[];
  careerGoal: string;
  headline?: string;
  about?: string;
  experience?: string;
}

const SYSTEM_PROMPT = `You are a LinkedIn profile editor. You will receive raw pasted text for one or more sections (headline, about, experience). For each section that was actually provided (skip sections that are empty), return: a score 0-100 for clarity/keyword-relevance/professionalism, a critique (2-3 sentences, specific — name what's vague, generic, or missing), and a suggested_rewrite that keeps the person's real facts/claims but tightens language and adds relevant keywords from their skills. Never invent achievements, titles, or metrics that were not in the original text. Output strict JSON only, no preamble, no markdown fence: {"sections": [{"section": "headline"|"about"|"experience", "score": number, "critique": string, "suggested_rewrite": string}]}.`;

export async function auditProfile(
  provider: AIProvider,
  input: ProfileAuditInput
): Promise<ProfileAudit> {
  const sections: string[] = [];
  if (input.headline) sections.push(`HEADLINE:\n${input.headline}`);
  if (input.about) sections.push(`ABOUT:\n${input.about}`);
  if (input.experience) sections.push(`EXPERIENCE:\n${input.experience}`);

  if (sections.length === 0) {
    throw new Error("auditProfile requires at least one non-empty section");
  }

  const prompt = [
    `Profession: ${input.profession}`,
    `Industry: ${input.industry}`,
    `Skills: ${input.skills.join(", ")}`,
    `Career goal: ${input.careerGoal}`,
    "",
    ...sections,
  ].join("\n");

  const raw = await provider.generate(prompt, {
    system: SYSTEM_PROMPT,
    maxTokens: 1500,
    temperature: 0.4,
  });

  const result = parseAIJson(raw, ProfileAuditSchema);

  // Contract guard beyond the schema: the agent must not return a
  // rewrite for a section that wasn't given input (see AI Prompts doc).
  const providedSections = new Set(
    [
      input.headline ? "headline" : null,
      input.about ? "about" : null,
      input.experience ? "experience" : null,
    ].filter((s): s is string => s !== null)
  );
  const unexpected = result.sections.filter(
    (s) => !providedSections.has(s.section)
  );
  if (unexpected.length > 0) {
    throw new Error(
      `Profile audit agent returned sections that were not provided as input: ${unexpected
        .map((s) => s.section)
        .join(", ")}`
    );
  }

  return result;
}
