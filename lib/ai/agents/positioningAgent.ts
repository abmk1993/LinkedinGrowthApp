import { z } from "zod";
import { AIProvider } from "../provider";
import { parseAIJson } from "../parseJson";

export const PositioningSchema = z.object({
  pillars: z.array(z.string().min(1)).min(3).max(5),
  target_audience: z.string().min(1),
  content_style: z.string().min(1),
});

export type Positioning = z.infer<typeof PositioningSchema>;

export interface PositioningInput {
  profession: string;
  industry: string;
  experienceLevel: string;
  skills: string[];
  interests: string[];
  careerGoal: string;
}

const SYSTEM_PROMPT = `You are a personal-branding strategist. Given a professional's profession, industry, experience level, skills, interests, and career goal, produce: (1) 3-5 content pillars specific enough to guide weekly posts, not generic ("AI-assisted E2E testing" not "Testing"), (2) a one-line target audience description, (3) a recommended content style (e.g. "practical, first-person, example-driven"). Never use a literal double-quote character inside a string value in your output — it breaks the JSON. Output strict JSON only, no preamble, no markdown fence: {"pillars": string[], "target_audience": string, "content_style": string}.`;

export async function generatePositioning(
  provider: AIProvider,
  input: PositioningInput
): Promise<Positioning> {
  const prompt = [
    `Profession: ${input.profession}`,
    `Industry: ${input.industry}`,
    `Experience level: ${input.experienceLevel}`,
    `Skills: ${input.skills.join(", ")}`,
    `Interests: ${input.interests.join(", ")}`,
    `Career goal: ${input.careerGoal}`,
  ].join("\n");

  const raw = await provider.generate(prompt, {
    system: SYSTEM_PROMPT,
    maxTokens: 800,
    temperature: 0.4,
  });

  return parseAIJson(raw, PositioningSchema);
}
