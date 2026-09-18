import { SearchProvider } from "./provider";
import { getSerperProvider } from "./serperProvider";
import { MockSearchProvider } from "./mockProvider";

let mockSingleton: MockSearchProvider | null = null;

/**
 * Mirrors lib/ai/getProvider.ts — same USE_MOCK_AI_PROVIDER flag
 * switches both AI and search to mocks together, since the research
 * pipeline test only makes sense with both mocked or both real.
 */
export function getSearchProvider(): SearchProvider {
  if (process.env.USE_MOCK_AI_PROVIDER === "true") {
    if (!mockSingleton) {
      mockSingleton = new MockSearchProvider();
      // Every research query ends in "news <year>" — one fixed result is
      // enough for the pipeline to reach the (also mocked) Research Agent.
      mockSingleton.stub("news", [
        {
          title: "Playwright release notes",
          url: "https://playwright.dev/docs/release-notes",
          snippet: "Trace viewer now supports step-through DOM snapshots.",
        },
      ]);
    }
    return mockSingleton;
  }
  return getSerperProvider();
}
