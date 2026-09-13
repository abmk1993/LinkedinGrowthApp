import { SearchProvider } from "../search/provider";
import { AIProvider } from "../ai/provider";
import {
  researchPillar,
  dedupeResearchItems,
  rankAndTrim,
  type ResearchItem,
} from "../ai/agents/researchAgent";

export interface PipelineInput {
  profession: string;
  industry: string;
  pillars: string[];
  skills: string[];
}

const RESULT_LIMITS = { update: 5, trend: 3, post_opportunity: 3 };

/**
 * Runs one research cycle: search each pillar, synthesize items via
 * the Research Agent, dedupe across pillars, then trim to the target
 * mix. Pillars run sequentially, not in parallel — see the note in
 * the dev plan (section 7) on starting with 1 pillar / no parallelism
 * to validate the prompt before optimizing for speed.
 */
export async function runResearchPipeline(
  aiProvider: AIProvider,
  searchProvider: SearchProvider,
  input: PipelineInput
): Promise<ResearchItem[]> {
  const allItems: ResearchItem[] = [];

  const currentYear = new Date().getFullYear();

  for (const pillar of input.pillars) {
    const searchResults = await searchProvider.search(
      `${pillar} ${input.industry} news ${currentYear}`
    );

    if (searchResults.length === 0) continue;

    const formattedResults = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
      .join("\n\n");

    try {
      const items = await researchPillar(aiProvider, {
        profession: input.profession,
        industry: input.industry,
        pillar,
        skills: input.skills,
        searchResults: formattedResults,
      });
      allItems.push(...items);
    } catch {
      // One pillar's AI call failing (bad JSON, schema mismatch)
      // shouldn't sink the whole run — skip it, keep the rest. A
      // run that returns fewer items than requested is far better
      // than one that returns none because of a single bad pillar.
      continue;
    }
  }

  const deduped = dedupeResearchItems(allItems);
  return rankAndTrim(deduped, RESULT_LIMITS);
}
