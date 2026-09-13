import { z } from "zod";
import { AIProvider } from "../provider";
import { parseAIJson } from "../parseJson";

export const ResearchItemSchema = z.object({
  topic: z.string().min(1),
  why_it_matters: z.string().min(1),
  why_you: z.string().min(1),
  suggested_angle: z.string().min(1),
  source_name: z.string().min(1),
  source_url: z.string().url(),
  category: z.enum(["update", "trend", "post_opportunity"]),
});

export const ResearchResultSchema = z.object({
  items: z.array(ResearchItemSchema),
});

export type ResearchItem = z.infer<typeof ResearchItemSchema>;

const SYSTEM_PROMPT = `You are researching current, genuinely interesting developments for a professional. Find real, specific, recent items from the search results provided — not generic advice. For each item return: topic, why_it_matters (1-2 sentences), why_you (why this specific person, given their skills, should have a credible opinion), suggested_angle (a concrete post angle, not "share your thoughts"), source_name, source_url, category (update/trend/post_opportunity). Avoid anything vague enough to apply to any professional in any field. Never use a literal double-quote character inside a string value — use single quotes instead if you need to quote a title or phrase, since a double quote inside a JSON string breaks the output. Output strict JSON only, no preamble, no markdown fence: {"items": [...]}.`;

export interface ResearchAgentInput {
  profession: string;
  industry: string;
  pillar: string;
  skills: string[];
  /** Raw search results text to synthesize from. */
  searchResults: string;
}

export async function researchPillar(
  provider: AIProvider,
  input: ResearchAgentInput
): Promise<ResearchItem[]> {
  const prompt = [
    `Profession: ${input.profession}`,
    `Industry: ${input.industry}`,
    `Pillar to focus on: ${input.pillar}`,
    `Skills: ${input.skills.join(", ")}`,
    "",
    "Search results:",
    input.searchResults,
  ].join("\n");

  const raw = await provider.generate(prompt, {
    system: SYSTEM_PROMPT,
    maxTokens: 2000,
    temperature: 0.5,
  });

  const result = parseAIJson(raw, ResearchResultSchema);
  return result.items;
}

/**
 * Dedupes research items across pillars by source_url first (exact,
 * cheap), then by a normalized-topic near-match (cheap heuristic —
 * lowercase, strip punctuation, compare). Keeps the first occurrence.
 */
export function dedupeResearchItems(items: ResearchItem[]): ResearchItem[] {
  const seenUrls = new Set<string>();
  const seenTopics = new Set<string>();
  const result: ResearchItem[] = [];

  for (const item of items) {
    const normalizedTopic = normalizeTopic(item.topic);

    if (seenUrls.has(item.source_url)) continue;
    if (seenTopics.has(normalizedTopic)) continue;

    seenUrls.add(item.source_url);
    seenTopics.add(normalizedTopic);
    result.push(item);
  }

  return result;
}

function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trims a deduped list to the target mix, preserving relative order within each category. */
export function rankAndTrim(
  items: ResearchItem[],
  limits: { update: number; trend: number; post_opportunity: number }
): ResearchItem[] {
  const counts: Record<ResearchItem["category"], number> = {
    update: 0,
    trend: 0,
    post_opportunity: 0,
  };

  return items.filter((item) => {
    if (counts[item.category] >= limits[item.category]) return false;
    counts[item.category] += 1;
    return true;
  });
}
