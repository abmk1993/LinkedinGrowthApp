import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseAIJson } from "@/lib/ai/parseJson";
import { AIProviderError } from "@/lib/ai/provider";

const schema = z.object({ pillars: z.array(z.string()).min(1) });

describe("parseAIJson", () => {
  it("parses clean JSON", () => {
    const result = parseAIJson('{"pillars": ["AI Testing"]}', schema);
    expect(result.pillars).toEqual(["AI Testing"]);
  });

  it("strips a markdown code fence before parsing", () => {
    const raw = '```json\n{"pillars": ["Playwright"]}\n```';
    const result = parseAIJson(raw, schema);
    expect(result.pillars).toEqual(["Playwright"]);
  });

  it("strips a bare code fence without a json language tag", () => {
    const raw = '```\n{"pillars": ["QA Leadership"]}\n```';
    const result = parseAIJson(raw, schema);
    expect(result.pillars).toEqual(["QA Leadership"]);
  });

  it("takes the last matching object when the reply contains two JSON objects", () => {
    const raw = '{"pillars": ["First draft"]}\nActually, better:\n{"pillars": ["Final answer"]}';
    const result = parseAIJson(raw, schema);
    expect(result.pillars).toEqual(["Final answer"]);
  });

  it("skips objects that don't match the schema when picking from several", () => {
    const raw = '{"pillars": ["The answer"]}\n{"note": "just commentary"}';
    const result = parseAIJson(raw, schema);
    expect(result.pillars).toEqual(["The answer"]);
  });

  it("extracts JSON surrounded by stray prose with no code fence", () => {
    const raw = 'Sure, here you go:\n{"pillars": ["AI Testing"]}\nLet me know if you need more.';
    const result = parseAIJson(raw, schema);
    expect(result.pillars).toEqual(["AI Testing"]);
  });

  it("repairs a string value containing an unescaped double quote", () => {
    // Mirrors the real failure: the model wraps a hook in literal
    // "quotes" using the same character that delimits the JSON string.
    const raw = '{"pillars": ["Ship "faster" with AI"]}';
    const result = parseAIJson(raw, schema);
    expect(result.pillars).toHaveLength(1);
    expect(result.pillars[0]).toContain("faster");
  });

  it("throws an AIProviderError on invalid JSON", () => {
    expect(() => parseAIJson("not json at all", schema)).toThrow(AIProviderError);
  });

  it("throws an AIProviderError when the shape doesn't match the schema", () => {
    expect(() => parseAIJson('{"pillars": "not an array"}', schema)).toThrow(
      AIProviderError
    );
  });

  it("throws when a required array is empty but schema requires min 1", () => {
    expect(() => parseAIJson('{"pillars": []}', schema)).toThrow(AIProviderError);
  });
});
