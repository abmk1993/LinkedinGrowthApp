import { z } from "zod";
import { AIProvider } from "../provider";
import { parseAIJson } from "../parseJson";

export const CarouselSlideSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().max(240).optional(),
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

const SYSTEM_PROMPT = `You are a LinkedIn carousel (native "document post") writer. Given an existing LinkedIn text post (hook, body, call to action), break it into 5-8 slides for a swipeable carousel — the highest-performing native format on LinkedIn right now. Rules: slide 1 is a cover slide using a punchy version of the hook as its title, with no body text or a very short subtitle; the middle slides each carry exactly ONE idea from the post's body — a short title (max ~8 words) plus 1-3 short sentences of body text, written in short lines with real substance, never generic filler; the final slide is a closing/CTA slide built from the call to action, ending with a specific, easy-to-answer question rather than a generic "Thoughts?". Never invent claims, numbers, or facts that were not in the original post. Never use a literal double-quote character inside a string value — use single quotes instead, since a double quote inside a JSON string breaks the output. Output strict JSON only, no preamble, no markdown fence: {"slides": [{"title": string, "body": string}]}.`;

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
