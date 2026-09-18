/**
 * Single source of truth for what actually gets pasted into LinkedIn —
 * the editor preview, the character counter, the publish page, and the
 * clipboard all build the post through here so they can't drift apart.
 */

export interface PostParts {
  hook: string | null | undefined;
  body: string | null | undefined;
  cta: string | null | undefined;
  hashtags: string[] | null | undefined;
}

// LinkedIn's limit applies to the whole post, not just the body.
export const MAX_POST_LENGTH = 3000;

/**
 * LinkedIn ends a hashtag at the first space or punctuation mark, so
 * "#CI/CD" links as "#CI" and a tag without "#" is plain text. Keep only
 * letters, digits, and underscores; returns "" for a tag with none left.
 */
export function formatHashtag(tag: string): string {
  const cleaned = tag.replace(/[^\p{L}\p{N}_]/gu, "");
  return cleaned ? `#${cleaned}` : "";
}

export function formatHashtags(tags: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags ?? []) {
    const formatted = formatHashtag(tag);
    const key = formatted.toLowerCase();
    if (formatted && !seen.has(key)) {
      seen.add(key);
      result.push(formatted);
    }
  }
  return result;
}

export function composePostText({ hook, body, cta, hashtags }: PostParts): string {
  return [hook, body, cta, formatHashtags(hashtags).join(" ")]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * The content agent leaves "[Add a real example: ...]" markers wherever
 * the post needs a detail only the user knows, instead of inventing one.
 */
export function findPlaceholders(text: string): string[] {
  return text.match(/\[[^\]\n]{3,}\]/g) ?? [];
}
