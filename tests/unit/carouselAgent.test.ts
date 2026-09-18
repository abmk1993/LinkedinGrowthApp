import { describe, expect, it } from "vitest";
import { CarouselSchema, clampText, generateCarousel } from "@/lib/ai/agents/carouselAgent";
import { MockAIProvider } from "@/lib/ai/mockProvider";

describe("clampText", () => {
  it("leaves text within the limit untouched", () => {
    expect(clampText("Short title", 80)).toBe("Short title");
  });

  it("cuts at the last full sentence when one ends past the halfway point", () => {
    const text = "First sentence is here. Second sentence is also here. Third one runs long.";
    expect(clampText(text, 60)).toBe("First sentence is here. Second sentence is also here.");
  });

  it("otherwise cuts at a word boundary and adds an ellipsis, staying within the limit", () => {
    const text = "one two three four five six seven eight nine ten eleven twelve";
    const result = clampText(text, 30);
    expect(result).toBe("one two three four five six…");
    expect(result.length).toBeLessThanOrEqual(30);
  });
});

describe("carouselAgent contract", () => {
  it("trims over-long slides instead of rejecting the whole carousel", async () => {
    const provider = new MockAIProvider();
    const longBody = "This slide body keeps going well past the layout limit. ".repeat(8);
    provider.stub(
      "HOOK:",
      JSON.stringify({
        slides: Array.from({ length: 5 }, (_, i) => ({
          title: `Slide ${i + 1} ${"with a very long title ".repeat(6)}`,
          body: longBody,
        })),
      })
    );

    const carousel = await generateCarousel(provider, { hook: "H", body: "B", cta: "C" });

    expect(carousel.slides).toHaveLength(5);
    for (const slide of carousel.slides) {
      expect(slide.title.length).toBeLessThanOrEqual(80);
      expect(slide.body?.length ?? 0).toBeLessThanOrEqual(240);
    }
  });

  it("still rejects a carousel with too few slides", () => {
    const result = CarouselSchema.safeParse({ slides: [{ title: "Only one" }] });
    expect(result.success).toBe(false);
  });
});
