const SEPARATOR = " ✅ ";
const TECH_STACK_LINE = /^\s*(tech(nical)?\s+stack|tools|skills)\s*:.*$/gim;

/**
 * Ends an About section with a scannable "Tech stack: A ✅ B ✅ C" line
 * built from the profile's saved skills, rather than trusting the model
 * to list them (it paraphrases, drops some, or invents others).
 *
 * Any stack/skills line the model wrote itself is removed first, so
 * running this twice — or on text that already has one — never
 * produces a duplicate.
 */
export function withTechStack(about: string, skills: string[]): string {
  const cleanSkills = skills.map((s) => s.trim()).filter(Boolean);
  const body = about.replace(TECH_STACK_LINE, "").replace(/\n{3,}/g, "\n\n").trim();
  if (cleanSkills.length === 0) return body;
  return `${body}\n\nTech stack: ${cleanSkills.join(SEPARATOR)}`;
}
