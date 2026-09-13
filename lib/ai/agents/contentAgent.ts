import { z } from "zod";
import { AIProvider } from "../provider";
import { parseAIJson } from "../parseJson";

export const GeneratedPostSchema = z.object({
  hooks: z.array(z.string().min(1)).length(3),
  body: z.string().min(1),
  cta: z.string(),
  hashtags: z.array(z.string()),
});

export type GeneratedPost = z.infer<typeof GeneratedPostSchema>;

export type RegenerationModifier =
  | "shorten"
  | "more_technical"
  | "more_personal"
  | "more_educational"
  | { changeTone: string };

export interface ContentAgentInput {
  profession: string;
  pillars: string[];
  contentStyle: string;
  careerGoal: string;
  topic: string;
  whyItMatters: string;
  whyYou: string;
  suggestedAngle: string;
  previousApprovedPosts?: string[];
  modifier?: RegenerationModifier;
}

const SYSTEM_PROMPT = `You are ghostwriting a LinkedIn post for a professional. Write in first person, as if the user personally has the experience described. Avoid AI-sounding phrasing (no "In today's fast-paced world", no excessive emoji, no generic CTAs like "Thoughts?" unless it genuinely fits). If previous approved posts are provided, match their voice, length, and structure. Never use a literal double-quote character inside any string value — if you need to quote or emphasize a phrase, use single quotes or an em dash instead, since a double quote inside a JSON string breaks the output. Output strict JSON only, no preamble, no markdown fence: {"hooks": [string, string, string], "body": string, "cta": string, "hashtags": string[]}.`;

export async function generatePost(
  provider: AIProvider,
  input: ContentAgentInput
): Promise<GeneratedPost> {
  const lines = [
    `Profession: ${input.profession}`,
    `Content pillars: ${input.pillars.join(", ")}`,
    `Content style: ${input.contentStyle}`,
    `Career goal: ${input.careerGoal}`,
    "",
    `Topic: ${input.topic}`,
    `Why it matters: ${input.whyItMatters}`,
    `Why this person specifically: ${input.whyYou}`,
    `Suggested angle: ${input.suggestedAngle}`,
  ];

  if (input.previousApprovedPosts?.length) {
    lines.push("", "Previous approved posts (match this voice):");
    input.previousApprovedPosts.forEach((p, i) => lines.push(`[${i + 1}] ${p}`));
  }

  if (input.modifier) {
    lines.push("", `Regeneration instruction: ${formatModifier(input.modifier)}`);
  }

  const raw = await provider.generate(lines.join("\n"), {
    system: SYSTEM_PROMPT,
    maxTokens: 2000,
    temperature: 0.7,
  });

  return parseAIJson(raw, GeneratedPostSchema);
}

function formatModifier(modifier: RegenerationModifier): string {
  if (typeof modifier === "object") return `change tone to: ${modifier.changeTone}`;
  switch (modifier) {
    case "shorten":
      return "shorten";
    case "more_technical":
      return "make more technical";
    case "more_personal":
      return "make more personal";
    case "more_educational":
      return "make more educational";
  }
}
