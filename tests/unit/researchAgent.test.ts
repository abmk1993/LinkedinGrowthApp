import { describe, expect, it } from "vitest";
import {
  dedupeResearchItems,
  rankAndTrim,
  type ResearchItem,
} from "@/lib/ai/agents/researchAgent";

function makeItem(overrides: Partial<ResearchItem> = {}): ResearchItem {
  return {
    topic: "Playwright ships new trace viewer",
    why_it_matters: "Faster debugging for flaky E2E tests.",
    why_you: "You run a Playwright suite in production.",
    suggested_angle: "Show a before/after debugging session.",
    source_name: "Playwright Blog",
    source_url: "https://playwright.dev/blog/trace-viewer",
    category: "update",
    ...overrides,
  };
}

describe("dedupeResearchItems", () => {
  it("removes exact source_url duplicates, keeping the first occurrence", () => {
    const a = makeItem({ topic: "First phrasing" });
    const b = makeItem({ topic: "Different phrasing, same source" });

    const result = dedupeResearchItems([a, b]);

    expect(result).toHaveLength(1);
    expect(result[0]?.topic).toBe("First phrasing");
  });

  it("removes near-identical topics even with different urls", () => {
    const a = makeItem({
      topic: "Playwright Introduces New Trace Viewer!",
      source_url: "https://a.example.com/1",
    });
    const b = makeItem({
      topic: "playwright introduces new trace viewer",
      source_url: "https://b.example.com/2",
    });

    const result = dedupeResearchItems([a, b]);

    expect(result).toHaveLength(1);
  });

  it("keeps genuinely distinct items", () => {
    const a = makeItem({
      topic: "Playwright trace viewer",
      source_url: "https://a.example.com/1",
    });
    const b = makeItem({
      topic: "AI-assisted test generation trend",
      source_url: "https://b.example.com/2",
      category: "trend",
    });

    const result = dedupeResearchItems([a, b]);

    expect(result).toHaveLength(2);
  });

  it("returns an empty array for empty input", () => {
    expect(dedupeResearchItems([])).toEqual([]);
  });
});

describe("rankAndTrim", () => {
  it("trims each category down to its limit, preserving order", () => {
    const items: ResearchItem[] = [
      makeItem({ topic: "u1", category: "update" }),
      makeItem({ topic: "u2", category: "update" }),
      makeItem({ topic: "u3", category: "update" }),
      makeItem({ topic: "t1", category: "trend" }),
      makeItem({ topic: "t2", category: "trend" }),
      makeItem({ topic: "p1", category: "post_opportunity" }),
    ];

    const result = rankAndTrim(items, { update: 2, trend: 1, post_opportunity: 3 });

    expect(result.map((i) => i.topic)).toEqual(["u1", "u2", "t1", "p1"]);
  });

  it("does not error when a category has fewer items than its limit", () => {
    const items: ResearchItem[] = [makeItem({ topic: "u1", category: "update" })];

    const result = rankAndTrim(items, { update: 5, trend: 3, post_opportunity: 3 });

    expect(result).toHaveLength(1);
  });
});
