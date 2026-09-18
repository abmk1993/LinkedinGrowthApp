import { z } from "zod";
import { AIProvider } from "../provider";
import { parseAIJson } from "../parseJson";
import { formatHashtags } from "@/lib/posts/composePost";

export const GeneratedPostSchema = z.object({
  hooks: z.array(z.string().min(1)).length(3),
  body: z.string().min(1),
  // The model is instructed to always include these, but sometimes omits
  // the key entirely instead of sending an empty value (especially if
  // output gets cut off near the token limit, since these come last in
  // the object) — default rather than fail the whole post over it.
  cta: z.string().default(""),
  // The model is inconsistent about the "#" prefix and sometimes returns
  // multi-word or punctuated tags that LinkedIn won't link.
  hashtags: z.array(z.string()).default([]).transform(formatHashtags),
});

export type GeneratedPost = z.infer<typeof GeneratedPostSchema>;

export type RegenerationModifier =
  | "shorten"
  | "more_technical"
  | "more_personal"
  | "more_educational"
  | { changeTone: string };

export interface ContentAgentInput {
  profession: string;
  pillars: string[];
  contentStyle: string;
  careerGoal: string;
  topic: string;
  whyItMatters: string;
  whyYou: string;
  suggestedAngle: string;
  previousApprovedPosts?: string[];
  modifier?: RegenerationModifier;
  /** The post as it currently stands in the editor — set when revising rather than drafting. */
  currentPost?: { hook: string; body: string; cta: string };
}

const SYSTEM_PROMPT = `You are ghostwriting a LinkedIn post for a professional. Write in first person, in their voice, as their informed take on the topic. You do not know what has actually happened in their work, so never invent personal experiences: no anecdotes, incidents, projects, numbers, percentages, durations, team sizes, or results that are not in the input. Facts about the topic itself must come from the provided context. The suggested angle is a direction, not a record of what happened — if it assumes experiences (things that 'saved us' or 'burned us'), write those parts as placeholders rather than filling them in. Where a concrete personal example would make the post stronger, insert a short bracketed placeholder telling the person what to add instead of making one up — e.g. [Add a real example: a time a flaky test hid a real bug in your suite]. Use at most 2 placeholders. The hooks are alternative opening lines; the body continues directly after whichever hook the person picks, so never repeat or paraphrase a hook at the start of the body. Hashtags are 3-6 single-word tags such as #TestAutomation, with no spaces or punctuation inside a tag. Avoid AI-sounding phrasing (no "In today's fast-paced world", no excessive emoji, no generic CTAs like "Thoughts?" unless it genuinely fits). If previous approved posts are provided, match their voice, length, and structure only — never reuse their topics, examples, stories, or claims, and never treat anything in them as a fact about this person's work. Never use a literal double-quote character inside any string value — if you need to quote or emphasize a phrase, use single quotes or an em dash instead, since a double quote inside a JSON string breaks the output. Output strict JSON only, no preamble, no markdown fence: {"hooks": [string, string, string], "body": string, "cta": string, "hashtags": string[]}.`;

export async function generatePost(
  provider: AIProvider,
  input: ContentAgentInput
): Promise<GeneratedPost> {
  const lines = [
    `Profession: ${input.profession}`,
    `Content pillars: ${input.pillars.join(", ")}`,
    `Content style: ${input.contentStyle}`,
    `Career goal: ${input.careerGoal}`,
    "",
    `Topic: ${input.topic}`,
    `Why it matters: ${input.whyItMatters}`,
    `Why this person specifically: ${input.whyYou}`,
    `Suggested angle: ${input.suggestedAngle}`,
  ];

  if (input.previousApprovedPosts?.length) {
    lines.push(
      "",
      "Previous approved posts — for voice, tone, and structure ONLY. Do not reuse any of their content, examples, or claims:"
    );
    input.previousApprovedPosts.forEach((p, i) => lines.push(`[${i + 1}] ${p}`));
  }

  if (input.currentPost) {
    lines.push(
      "",
      "Current post to revise — keep its facts, claims, and any bracketed placeholders; do not add new claims:",
      `HOOK: ${input.currentPost.hook}`,
      `BODY: ${input.currentPost.body}`,
      `CTA: ${input.currentPost.cta}`,
      "Return the revised hook as hooks[0], followed by two alternatives."
    );
  }

  if (input.modifier) {
    lines.push("", `Regeneration instruction: ${formatModifier(input.modifier)}`);
  }

  const raw = await provider.generate(lines.join("\n"), {
    system: SYSTEM_PROMPT,
    maxTokens: 3000,
    temperature: 0.7,
  });

  return parseAIJson(raw, GeneratedPostSchema);
}

function formatModifier(modifier: RegenerationModifier): string {
  if (typeof modifier === "object") return `change tone to: ${modifier.changeTone}`;
  switch (modifier) {
    case "shorten":
      return "shorten";
    case "more_technical":
      return "make more technical";
    case "more_personal":
      // Without this, "personal" reliably reads as "invent a war story".
      return "make more personal — more of their own voice and opinion, with placeholders where their real experiences belong";
    case "more_educational":
      return "make more educational";
  }
}
