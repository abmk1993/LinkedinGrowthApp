import { describe, expect, it } from "vitest";
import { withTechStack } from "@/lib/profile/techStack";

describe("withTechStack", () => {
  it("appends the saved skills as a ✅-separated tech stack line", () => {
    expect(withTechStack("I build reliable test suites.", ["Playwright", "TypeScript", "CI/CD"])).toBe(
      "I build reliable test suites.\n\nTech stack: Playwright ✅ TypeScript ✅ CI/CD"
    );
  });

  it("replaces a stack line the model wrote itself instead of duplicating it", () => {
    const about = "Paragraph one.\n\nTools: Playwright, Jest\n\nParagraph two.";
    expect(withTechStack(about, ["Playwright", "Appium"])).toBe(
      "Paragraph one.\n\nParagraph two.\n\nTech stack: Playwright ✅ Appium"
    );
  });

  it("is idempotent", () => {
    const once = withTechStack("About me.", ["Playwright", "JMeter"]);
    expect(withTechStack(once, ["Playwright", "JMeter"])).toBe(once);
  });

  it("leaves the text alone when there are no skills", () => {
    expect(withTechStack("  About me.  ", [" ", ""])).toBe("About me.");
  });
});
