import { z } from "zod";
import { AIProvider, AIProviderError } from "../provider";
import { parseAIJson } from "../parseJson";

export const ProfileAuditSectionSchema = z.object({
  section: z.enum(["headline", "about", "experience"]),
  // Only present for the screenshot path — the model transcribes what
  // it read, since that's the only way we know what's on the profile.
  // The paste-text path already has this from the user, so the model
  // isn't asked to repeat it back. No .min(1): the model is instructed
  // to skip sections it can't see, but occasionally returns one anyway
  // with an empty transcription — that's filtered out in code (see
  // auditProfileFromImages) rather than rejected here, since one bad
  // section shouldn't fail parsing for the whole response.
  original_text: z.string().optional(),
  score: z.number().int().min(0).max(100),
  critique: z.string().min(1),
  suggested_rewrite: z.string().min(1),
});

export const ProfileAuditSchema = z.object({
  sections: z.array(ProfileAuditSectionSchema).min(1),
});

export type ProfileAudit = z.infer<typeof ProfileAuditSchema>;

interface BaseInput {
  profession: string;
  industry: string;
  skills: string[];
  careerGoal: string;
}

// ---------------------------------------------------------------------
// Paste-text path — the original flow. Kept alongside screenshots (not
// replaced by them) for anyone who'd rather type than upload.
// ---------------------------------------------------------------------

export interface ProfileAuditTextInput extends BaseInput {
  headline?: string;
  about?: string;
  experience?: string;
}

const TEXT_SYSTEM_PROMPT = `You are a LinkedIn profile editor. You will receive raw pasted text for one or more sections (headline, about, experience). For each section that was actually provided (skip sections that are empty), return: a score 0-100 for clarity/keyword-relevance/professionalism, a critique (2-3 sentences, specific — name what's vague, generic, or missing), and a suggested_rewrite that keeps the person's real facts/claims but tightens language and adds relevant keywords from their skills. Never invent achievements, titles, or metrics that were not in the original text. Never use a literal double-quote character inside a string value — use single quotes instead if you need to quote something, since a double quote inside a JSON string breaks the output. Output strict JSON only, no preamble, no markdown fence: {"sections": [{"section": "headline"|"about"|"experience", "score": number, "critique": string, "suggested_rewrite": string}]}.`;

export async function auditProfileFromText(
  provider: AIProvider,
  input: ProfileAuditTextInput
): Promise<ProfileAudit> {
  const sections: string[] = [];
  if (input.headline) sections.push(`HEADLINE:\n${input.headline}`);
  if (input.about) sections.push(`ABOUT:\n${input.about}`);
  if (input.experience) sections.push(`EXPERIENCE:\n${input.experience}`);

  if (sections.length === 0) {
    throw new Error("auditProfileFromText requires at least one non-empty section");
  }

  const prompt = [
    `Profession: ${input.profession}`,
    `Industry: ${input.industry}`,
    `Skills: ${input.skills.join(", ")}`,
    `Career goal: ${input.careerGoal}`,
    "",
    ...sections,
  ].join("\n");

  const raw = await provider.generate(prompt, {
    system: TEXT_SYSTEM_PROMPT,
    maxTokens: 1500,
    temperature: 0.4,
  });

  const result = parseAIJson(raw, ProfileAuditSchema);

  // Contract guard beyond the schema: the agent must not return a
  // rewrite for a section that wasn't given input.
  const providedSections = new Set(
    [
      input.headline ? "headline" : null,
      input.about ? "about" : null,
      input.experience ? "experience" : null,
    ].filter((s): s is string => s !== null)
  );
  const unexpected = result.sections.filter((s) => !providedSections.has(s.section));
  if (unexpected.length > 0) {
    throw new Error(
      `Profile audit agent returned sections that were not provided as input: ${unexpected
        .map((s) => s.section)
        .join(", ")}`
    );
  }

  return result;
}

// ---------------------------------------------------------------------
// Screenshot path — for anyone who'd rather not retype their profile.
// Also the only option that doesn't require pasting anything at all,
// which matters because scraping a LinkedIn profile by URL would
// violate LinkedIn's Terms of Service; a screenshot is content the user
// is directly choosing to share, so there's no scraping involved.
// ---------------------------------------------------------------------

export interface ProfileAuditImage {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export interface ProfileAuditImageInput extends BaseInput {
  /**
   * One or more screenshots of the person's actual LinkedIn profile
   * page. A full profile rarely fits in one screenshot, so this expects
   * however many the user needed to capture headline / About /
   * experience — order doesn't matter, the model looks across all of
   * them for whichever sections are visible.
   */
  images: ProfileAuditImage[];
}

const IMAGE_SYSTEM_PROMPT = `You are a LinkedIn profile editor. You will receive one or more screenshots of a professional's actual LinkedIn profile page — they may be different scrolled sections of the same profile, in any order. Look across all of them for whichever of these sections are visible: headline (the line under the person's name, near the top), about (the summary paragraph below the banner photo), experience (the description text under a role). For each section you can actually see in at least one screenshot: transcribe its current text exactly as shown (original_text), then give a score 0-100 for clarity/keyword-relevance/professionalism, a critique (2-3 sentences, specific — name what's vague, generic, or missing), and a suggested_rewrite that keeps the person's real facts/claims but tightens language and adds relevant keywords from their skills. Skip any section that isn't visible in any screenshot — do not guess or invent one. Never invent achievements, titles, or metrics that aren't visible in the screenshots. Never use a literal double-quote character inside a string value — use single quotes instead if you need to quote something, since a double quote inside a JSON string breaks the output. Output strict JSON only, no preamble, no markdown fence: {"sections": [{"section": "headline"|"about"|"experience", "original_text": string, "score": number, "critique": string, "suggested_rewrite": string}]}.`;

export async function auditProfileFromImages(
  provider: AIProvider,
  input: ProfileAuditImageInput
): Promise<ProfileAudit> {
  if (input.images.length === 0) {
    throw new Error("auditProfileFromImages requires at least one screenshot image");
  }

  const prompt = [
    `Profession: ${input.profession}`,
    `Industry: ${input.industry}`,
    `Skills: ${input.skills.join(", ")}`,
    `Career goal: ${input.careerGoal}`,
    "",
    `Attached: ${input.images.length} screenshot(s) of this person's LinkedIn profile page.`,
  ].join("\n");

  const raw = await provider.generate(prompt, {
    system: IMAGE_SYSTEM_PROMPT,
    maxTokens: 1500,
    temperature: 0.4,
    images: input.images,
  });

  const result = parseAIJson(raw, ProfileAuditSchema);

  // Contract guard beyond the schema: original_text is mandatory here (a
  // section the model can't transcribe is one it shouldn't be scoring
  // either), but the model doesn't always follow "skip sections you
  // can't see" — sometimes it returns one anyway with an empty
  // transcription (e.g. an About section that's genuinely blank on the
  // profile). Drop those rather than failing the whole audit over one
  // unreadable section; only error out if nothing usable came back.
  const sections = result.sections.filter(
    (s): s is typeof s & { original_text: string } =>
      Boolean(s.original_text && s.original_text.trim().length > 0)
  );
  if (sections.length === 0) {
    throw new AIProviderError(
      "Could not read any profile text from the screenshot(s) provided — try a clearer screenshot."
    );
  }

  return { sections };
}
