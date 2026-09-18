import { z } from "zod";
import { AIProvider } from "../provider";
import { parseAIJson } from "../parseJson";

const TITLE_MAX = 80;
const BODY_MAX = 240;

/**
 * The PDF layout only fits TITLE_MAX / BODY_MAX characters, and the model
 * overshoots them now and then even when told the limits. Rejecting the
 * whole deck over one long slide made the carousel fail most of the time,
 * so trim at a sentence (or failing that, word) boundary instead.
 */
export function clampText(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;

  const window = trimmed.slice(0, max);
  const sentenceEnd = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "));
  if (sentenceEnd > max * 0.5) return window.slice(0, sentenceEnd + 1);

  const wordEnd = trimmed.slice(0, max - 1).lastIndexOf(" ");
  return `${trimmed.slice(0, wordEnd > 0 ? wordEnd : max - 1).trimEnd()}…`;
}

export const CarouselSlideSchema = z.object({
  title: z.string().trim().min(1).transform((t) => clampText(t, TITLE_MAX)),
  body: z
    .string()
    .optional()
    .transform((b) => (b ? clampText(b, BODY_MAX) : b)),
});

export const CarouselSchema = z.object({
  slides: z.array(CarouselSlideSchema).min(5).max(8),
});

export type Carousel = z.infer<typeof CarouselSchema>;

export interface CarouselInput {
  hook: string;
  body: string;
  cta: string;
}

const SYSTEM_PROMPT = `You are a LinkedIn carousel (native "document post") writer. Given an existing LinkedIn text post (hook, body, call to action), break it into 5-8 slides for a swipeable carousel — the highest-performing native format on LinkedIn right now. Rules: slide 1 is a cover slide using a punchy version of the hook as its title, with no body text or a very short subtitle; the middle slides each carry exactly ONE idea from the post's body — a short title (max ~8 words) plus 1-3 short sentences of body text, written in short lines with real substance, never generic filler; the final slide is a closing/CTA slide built from the call to action, ending with a specific, easy-to-answer question rather than a generic "Thoughts?". Hard limits, since the slides are laid out at a fixed size: every title at most ${TITLE_MAX - 20} characters, every body at most ${BODY_MAX - 40} characters. Never invent claims, numbers, or facts that were not in the original post. Never use a literal double-quote character inside a string value — use single quotes instead, since a double quote inside a JSON string breaks the output. Output strict JSON only, no preamble, no markdown fence: {"slides": [{"title": string, "body": string}]}.`;

export async function generateCarousel(
  provider: AIProvider,
  input: CarouselInput
): Promise<Carousel> {
  const prompt = [`HOOK:\n${input.hook}`, `BODY:\n${input.body}`, `CTA:\n${input.cta}`].join(
    "\n\n"
  );

  const raw = await provider.generate(prompt, {
    system: SYSTEM_PROMPT,
    maxTokens: 1200,
    temperature: 0.5,
  });

  return parseAIJson(raw, CarouselSchema);
}
