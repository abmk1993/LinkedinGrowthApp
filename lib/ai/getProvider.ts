import { AIProvider } from "./provider";
import { getClaudeProvider } from "./claudeProvider";
import { MockAIProvider } from "./mockProvider";
import { seedE2EStubs } from "./e2eFixtures";

let mockSingleton: MockAIProvider | null = null;

/**
 * Single entry point every API route should use to get an AI provider.
 * Swaps to a seeded MockAIProvider when USE_MOCK_AI_PROVIDER=true (set
 * by playwright.config.ts's webServer.env for E2E runs), so E2E tests
 * never hit the real, billed, non-deterministic Claude API.
 */
export function getAIProvider(): AIProvider {
  if (process.env.USE_MOCK_AI_PROVIDER === "true") {
    if (!mockSingleton) {
      mockSingleton = new MockAIProvider();
      seedE2EStubs(mockSingleton);
    }
    return mockSingleton;
  }
  return getClaudeProvider();
}
