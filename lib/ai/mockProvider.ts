import { AIProvider, GenerateOptions } from "./provider";

/**
 * Deterministic mock for tests. Returns fixed responses keyed by a
 * substring match against the prompt, so tests stay readable ("when the
 * positioning prompt is sent, return this fixture") without needing a
 * real, billed, non-deterministic API call.
 *
 * Usage in a test:
 *   const provider = new MockAIProvider();
 *   provider.stub("content pillars", JSON.stringify({ pillars: [...] }));
 */
export class MockAIProvider implements AIProvider {
  private stubs: Array<{ match: string; response: string }> = [];
  public calls: Array<{ prompt: string; options?: GenerateOptions }> = [];

  stub(matchSubstring: string, response: string): void {
    this.stubs.push({ match: matchSubstring, response });
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    this.calls.push({ prompt, options });

    const found = this.stubs.find((s) => prompt.includes(s.match));
    if (found) return found.response;

    throw new Error(
      `MockAIProvider: no stub matched prompt. First 120 chars: "${prompt.slice(
        0,
        120
      )}"`
    );
  }
}
