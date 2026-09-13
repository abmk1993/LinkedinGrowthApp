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
    if (!mockSingleton) mockSingleton = new MockSearchProvider();
    return mockSingleton;
  }
  return getSerperProvider();
}
