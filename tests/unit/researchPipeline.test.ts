import { describe, expect, it } from "vitest";
import { runResearchPipeline } from "@/lib/research/pipeline";
import type { AIProvider } from "@/lib/ai/provider";
import { MockSearchProvider } from "@/lib/search/mockProvider";

const PILLARS = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"];

/**
 * Answers each pillar's research prompt with one item named after the
 * pillar, after a per-pillar delay — so later pillars can finish first —
 * while tracking how many calls are in flight at once.
 */
function makeSlowProvider(delays: Record<string, number>) {
  let inFlight = 0;
  let maxInFlight = 0;

  const provider: AIProvider = {
    async generate(prompt) {
      const pillar = prompt.match(/Pillar to focus on: (\w+)/)?.[1] ?? "?";
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, delays[pillar] ?? 0));
      inFlight--;
      return JSON.stringify({
        items: [
          {
            topic: `${pillar} development in QA tooling`,
            why_it_matters: "It matters.",
            why_you: "You work on it.",
            suggested_angle: "A concrete angle.",
            source_name: "Example",
            source_url: `https://example.com/${pillar.toLowerCase()}`,
            category: "update",
          },
        ],
      });
    },
  };

  return { provider, getMaxInFlight: () => maxInFlight };
}

describe("runResearchPipeline", () => {
  it("runs pillars concurrently but at most 3 at a time, keeping pillar order in the results", async () => {
    const search = new MockSearchProvider();
    search.stub("news", [{ title: "t", url: "https://example.com", snippet: "s" }]);
    // Earlier pillars are slowest, so completion order is the reverse of input order.
    const { provider, getMaxInFlight } = makeSlowProvider({
      Alpha: 50,
      Bravo: 40,
      Charlie: 30,
      Delta: 20,
      Echo: 10,
    });

    const items = await runResearchPipeline(provider, search, {
      profession: "QA Automation Engineer",
      industry: "Sportsbook",
      pillars: PILLARS,
      skills: ["Playwright"],
    });

    expect(getMaxInFlight()).toBe(3);
    expect(items.map((i) => i.topic.split(" ")[0])).toEqual(PILLARS);
  });

  it("skips a pillar whose AI call fails instead of failing the run", async () => {
    const search = new MockSearchProvider();
    search.stub("news", [{ title: "t", url: "https://example.com", snippet: "s" }]);
    const { provider } = makeSlowProvider({});
    const failingForBravo: AIProvider = {
      generate: (prompt, options) =>
        prompt.includes("Pillar to focus on: Bravo")
          ? Promise.resolve("not json")
          : provider.generate(prompt, options),
    };

    const items = await runResearchPipeline(failingForBravo, search, {
      profession: "QA Automation Engineer",
      industry: "Sportsbook",
      pillars: ["Alpha", "Bravo", "Charlie"],
      skills: [],
    });

    expect(items.map((i) => i.topic.split(" ")[0])).toEqual(["Alpha", "Charlie"]);
  });
});
