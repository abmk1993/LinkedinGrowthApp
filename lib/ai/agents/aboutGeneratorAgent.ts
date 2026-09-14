import { z } from "zod";
import { AIProvider } from "../provider";
import { parseAIJson } from "../parseJson";

export const AboutDraftSchema = z.object({
  about: z.string().min(1),
});

export type AboutDraft = z.infer<typeof AboutDraftSchema>;

export interface AboutGeneratorInput {
  profession: string;
  industry: string;
  experienceLevel: string;
  skills: string[];
  interests: string[];
  careerGoal: string;
  pillars?: string[];
  contentStyle?: string;
}

const SYSTEM_PROMPT = `You are a LinkedIn profile writer. Given a professional's profession, industry, experience level, skills, interests, and career goal, write a first-person "About" section for their LinkedIn profile: 3-4 short paragraphs, concrete and specific rather than generic buzzwords, written in their voice, highlighting real expertise and what they're looking to do next. Never use a literal double-quote character inside a string value in your output — it breaks the JSON. Output strict JSON only, no preamble, no markdown fence: {"about": string}.`;

export async function generateAboutSection(
  provider: AIProvider,
  input: AboutGeneratorInput
): Promise<AboutDraft> {
  const prompt = [
    `Profession: ${input.profession}`,
    `Industry: ${input.industry}`,
    `Experience level: ${input.experienceLevel}`,
    `Skills: ${input.skills.join(", ")}`,
    `Interests: ${input.interests.join(", ")}`,
    `Career goal: ${input.careerGoal}`,
    input.pillars?.length ? `Content pillars: ${input.pillars.join(", ")}` : null,
    input.contentStyle ? `Preferred voice/style: ${input.contentStyle}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const raw = await provider.generate(prompt, {
    system: SYSTEM_PROMPT,
    maxTokens: 900,
    temperature: 0.6,
  });

  return parseAIJson(raw, AboutDraftSchema);
}
