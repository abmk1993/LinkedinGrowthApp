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

// Each pillar is one search plus one ~30s model call. Run sequentially,
// five pillars took three minutes in a single request; this keeps the
// wait down without firing every call at the API at once.
const PILLAR_CONCURRENCY = 3;

/**
 * Runs one research cycle: search each pillar, synthesize items via
 * the Research Agent, dedupe across pillars, then trim to the target
 * mix. Results are merged in pillar order regardless of which pillar
 * finishes first, so dedupe/ranking stay deterministic.
 */
export async function runResearchPipeline(
  aiProvider: AIProvider,
  searchProvider: SearchProvider,
  input: PipelineInput
): Promise<ResearchItem[]> {
  const currentYear = new Date().getFullYear();

  async function researchOnePillar(pillar: string): Promise<ResearchItem[]> {
    const searchResults = await searchProvider.search(
      `${pillar} ${input.industry} news ${currentYear}`
    );

    if (searchResults.length === 0) return [];

    const formattedResults = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
      .join("\n\n");

    try {
      return await researchPillar(aiProvider, {
        profession: input.profession,
        industry: input.industry,
        pillar,
        skills: input.skills,
        searchResults: formattedResults,
      });
    } catch {
      // One pillar's AI call failing (bad JSON, schema mismatch)
      // shouldn't sink the whole run — skip it, keep the rest. A
      // run that returns fewer items than requested is far better
      // than one that returns none because of a single bad pillar.
      return [];
    }
  }

  const perPillar = await mapWithConcurrency(input.pillars, PILLAR_CONCURRENCY, researchOnePillar);

  const deduped = dedupeResearchItems(perPillar.flat());
  return rankAndTrim(deduped, RESULT_LIMITS);
}

/** Like Promise.all over `items.map(fn)`, but with at most `limit` calls in flight. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
