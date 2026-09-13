import { ZodSchema } from "zod";
import { jsonrepair } from "jsonrepair";
import { AIProviderError } from "./provider";

/**
 * Parses and validates an AI response against a zod schema.
 *
 * Models occasionally wrap JSON in markdown fences, add a stray
 * preamble/postamble sentence despite instructions not to, or write a
 * string value that itself contains an unescaped double-quote (e.g. a
 * hook wrapped in "quotes" inside a JSON string also delimited by
 * quotes) — this tries progressively more aggressive recovery before
 * giving up, so a malformed response fails loudly and specifically
 * instead of crashing deeper in the call stack with a confusing error.
 */
export function parseAIJson<T>(raw: string, schema: ZodSchema<T>): T {
  const stripped = stripCodeFence(raw).trim();

  const parsed =
    tryParse(stripped) ??
    tryParse(extractOutermostObject(stripped)) ??
    tryRepair(extractOutermostObject(stripped) ?? stripped);
  if (parsed === undefined) {
    throw new AIProviderError(
      `AI response was not valid JSON after fence-stripping. First 200 chars: "${stripped.slice(
        0,
        200
      )}"`
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AIProviderError(
      `AI response JSON did not match expected schema: ${result.error.message}`
    );
  }

  return result.data;
}

function stripCodeFence(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenceMatch?.[1] ?? text;
}

function tryParse(text: string | null): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Last resort: jsonrepair fixes common LLM JSON mistakes (unescaped
 * quotes inside strings, trailing commas, missing closing brackets)
 * that plain re-parsing can't. It's heuristic, not guaranteed correct —
 * the schema check right after this is what actually decides whether
 * the repaired shape is trustworthy.
 */
function tryRepair(text: string): unknown {
  try {
    return JSON.parse(jsonrepair(text));
  } catch {
    return undefined;
  }
}

/**
 * Models sometimes add a stray sentence before or after the JSON object
 * despite instructions not to, with no code fence to strip it via. This
 * is a fallback for that case, not for truncated/malformed JSON — it
 * only trims text outside the outermost braces.
 */
function extractOutermostObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}
