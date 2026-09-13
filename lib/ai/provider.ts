/**
 * AI provider abstraction.
 *
 * Every route that needs an AI call depends on this interface, never on
 * a specific vendor SDK directly. That keeps two things possible without
 * touching call sites:
 *   1. Swapping Claude for another model later.
 *   2. Injecting a deterministic mock in tests (see lib/ai/mockProvider.ts)
 *      so CI never calls a real, billed, non-deterministic API.
 */

export interface GenerateOptions {
  /** System prompt / role instructions, kept separate from the user content. */
  system?: string;
  /** Upper bound on response length. */
  maxTokens?: number;
  /** Sampling temperature. Lower is more deterministic. Defaults to provider's own default. */
  temperature?: number;
  /**
   * Optional images to include alongside the text prompt, for
   * vision-capable calls (Photo Audit and Profile Audit agents).
   * Base64-encoded, no data URL prefix. Order is preserved in the
   * request, for prompts that reference "the attached screenshots"
   * collectively rather than individually.
   */
  images?: Array<{
    base64: string;
    mediaType: "image/jpeg" | "image/png" | "image/webp";
  }>;
}

export interface AIProvider {
  /**
   * Generate raw text from a prompt. Callers that need structured data
   * are responsible for instructing the model to return JSON and for
   * parsing/validating the result (see lib/ai/parseJson.ts).
   */
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
