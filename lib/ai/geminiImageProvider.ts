import { AIProviderError } from "./provider";
import { EditableImage, ImageEditProvider } from "./imageEditProvider";

// Google retires model ids fairly aggressively (2.5 text is already
// refused for new keys), so this is overridable without a code change.
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

/**
 * Gemini implementation of ImageEditProvider. The only file that should
 * import anything Google-specific.
 */
export class GeminiImageProvider implements ImageEditProvider {
  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new AIProviderError(
        "GeminiImageProvider requires an API key. Set GEMINI_API_KEY."
      );
    }
  }

  async edit(instruction: string, image: EditableImage): Promise<EditableImage> {
    let response: Response;
    try {
      response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: instruction },
                {
                  inline_data: {
                    mime_type: image.mediaType,
                    data: image.base64,
                  },
                },
              ],
            },
          ],
        }),
      });
    } catch (err) {
      throw new AIProviderError("Network error calling Gemini image API", err);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "<unreadable body>");
      throw new AIProviderError(`Gemini image API returned ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
    };

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((part) => part.inlineData?.data);

    if (!imagePart?.inlineData) {
      // Gemini refuses some edits of real people and explains why in a
      // text part instead — surface that rather than a generic failure.
      const explanation = parts.find((part) => part.text)?.text;
      throw new AIProviderError(
        explanation
          ? `Gemini returned no edited image: ${explanation}`
          : "Gemini returned no edited image"
      );
    }

    return {
      base64: imagePart.inlineData.data,
      mediaType: imagePart.inlineData.mimeType === "image/png" ? "image/png" : "image/jpeg",
    };
  }
}

let cached: GeminiImageProvider | null = null;

/** Returns null when no key is configured, so attire correction degrades instead of breaking. */
export function getGeminiImageProvider(): GeminiImageProvider | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!cached) {
    cached = new GeminiImageProvider(process.env.GEMINI_API_KEY);
  }
  return cached;
}
