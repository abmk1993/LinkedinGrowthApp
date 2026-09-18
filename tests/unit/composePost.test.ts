import { describe, expect, it } from "vitest";
import {
  composePostText,
  findPlaceholders,
  formatHashtag,
  formatHashtags,
} from "@/lib/posts/composePost";

describe("formatHashtag", () => {
  it("adds a missing # prefix", () => {
    expect(formatHashtag("Playwright")).toBe("#Playwright");
  });

  it("strips punctuation and spaces LinkedIn would cut the tag at", () => {
    expect(formatHashtag("#CI/CD")).toBe("#CICD");
    expect(formatHashtag("Sports betting")).toBe("#Sportsbetting");
    expect(formatHashtag("##QA")).toBe("#QA");
  });

  it("keeps non-ASCII letters", () => {
    expect(formatHashtag("Qualität")).toBe("#Qualität");
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(formatHashtag("#/-")).toBe("");
  });
});

describe("formatHashtags", () => {
  it("drops empties and case-insensitive duplicates, keeping the first spelling", () => {
    expect(formatHashtags(["#QA", "qa", "/", "Playwright"])).toEqual(["#QA", "#Playwright"]);
  });

  it("treats null as no hashtags", () => {
    expect(formatHashtags(null)).toEqual([]);
  });
});

describe("composePostText", () => {
  it("opens with the hook, then body, CTA, and hashtags", () => {
    expect(
      composePostText({
        hook: "Hook line.",
        body: "Body text.",
        cta: "What do you think about X?",
        hashtags: ["QA", "#Playwright"],
      })
    ).toBe("Hook line.\n\nBody text.\n\nWhat do you think about X?\n\n#QA #Playwright");
  });

  it("skips missing or blank parts without leaving empty paragraphs", () => {
    expect(composePostText({ hook: null, body: "Body.", cta: "  ", hashtags: [] })).toBe("Body.");
  });
});

describe("findPlaceholders", () => {
  it("finds bracketed markers left for the user to fill in", () => {
    const text = "Intro. [Add a real example: a flaky test you fixed] More. [Your team size]";
    expect(findPlaceholders(text)).toEqual([
      "[Add a real example: a flaky test you fixed]",
      "[Your team size]",
    ]);
  });

  it("ignores short bracketed text like list markers", () => {
    expect(findPlaceholders("Step [1] and [x] done")).toEqual([]);
  });
});
