import { AIProvider, AIProviderError, GenerateOptions } from "./provider";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 2000;

/**
 * Claude implementation of AIProvider. This is the only file in the
 * codebase that should import anything Anthropic-specific — every
 * other module talks to `AIProvider`, not to Claude.
 */
export class ClaudeProvider implements AIProvider {
  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new AIProviderError(
        "ClaudeProvider requires an API key. Set ANTHROPIC_API_KEY."
      );
    }
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const content: Array<Record<string, unknown>> = [];
    for (const image of options.images ?? []) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.base64,
        },
      });
    }
    content.push({ type: "text", text: prompt });

    let response: Response;
    try {
      response = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          temperature: options.temperature,
          system: options.system,
          messages: [{ role: "user", content }],
        }),
      });
    } catch (err) {
      throw new AIProviderError("Network error calling Claude API", err);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "<unreadable body>");
      throw new AIProviderError(
        `Claude API returned ${response.status}: ${body}`
      );
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    const textBlock = data.content.find((block) => block.type === "text");
    if (!textBlock?.text) {
      throw new AIProviderError(
        "Claude API response contained no text content block"
      );
    }

    return textBlock.text;
  }
}

let cached: ClaudeProvider | null = null;

/** Lazily-constructed singleton so we don't read env vars at import time (breaks tests). */
export function getClaudeProvider(): ClaudeProvider {
  if (!cached) {
    cached = new ClaudeProvider(process.env.ANTHROPIC_API_KEY ?? "");
  }
  return cached;
}
