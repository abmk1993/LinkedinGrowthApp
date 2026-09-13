import { describe, expect, it } from "vitest";
import { MockAIProvider } from "@/lib/ai/mockProvider";
import { generatePositioning } from "@/lib/ai/agents/positioningAgent";
import { generatePost } from "@/lib/ai/agents/contentAgent";
import { auditProfileFromImages, auditProfileFromText } from "@/lib/ai/agents/profileAuditAgent";

describe("positioningAgent contract", () => {
  it("returns 3-5 pillars, a target audience, and a content style", async () => {
    const provider = new MockAIProvider();
    provider.stub(
      "Profession: QA Engineer",
      JSON.stringify({
        pillars: ["AI Testing", "Playwright", "QA Leadership"],
        target_audience: "QA engineers exploring AI-assisted testing",
        content_style: "practical, first-person, example-driven",
      })
    );

    const result = await generatePositioning(provider, {
      profession: "QA Engineer",
      industry: "IT",
      experienceLevel: "Senior",
      skills: ["Playwright", "TypeScript"],
      interests: ["AI Testing"],
      careerGoal: "Become visible as a QA/AI Testing expert",
    });

    expect(result.pillars.length).toBeGreaterThanOrEqual(3);
    expect(result.pillars.length).toBeLessThanOrEqual(5);
    expect(result.target_audience).toBeTruthy();
    expect(result.content_style).toBeTruthy();
  });

  it("rejects a response with fewer than 3 pillars", async () => {
    const provider = new MockAIProvider();
    provider.stub(
      "Profession: QA Engineer",
      JSON.stringify({
        pillars: ["Only one"],
        target_audience: "x",
        content_style: "y",
      })
    );

    await expect(
      generatePositioning(provider, {
        profession: "QA Engineer",
        industry: "IT",
        experienceLevel: "Senior",
        skills: [],
        interests: [],
        careerGoal: "x",
      })
    ).rejects.toThrow();
  });
});

describe("contentAgent contract", () => {
  it("always returns exactly 3 hooks", async () => {
    const provider = new MockAIProvider();
    provider.stub(
      "Topic: Playwright trace viewer",
      JSON.stringify({
        hooks: ["Hook one", "Hook two", "Hook three"],
        body: "Full post body here.",
        cta: "What's your experience with this?",
        hashtags: ["#QA", "#Playwright"],
      })
    );

    const result = await generatePost(provider, {
      profession: "QA Engineer",
      pillars: ["Playwright"],
      contentStyle: "practical",
      careerGoal: "Become visible",
      topic: "Playwright trace viewer",
      whyItMatters: "Faster debugging",
      whyYou: "You use it daily",
      suggestedAngle: "Before/after",
    });

    expect(result.hooks).toHaveLength(3);
  });

  it("rejects a response with the wrong number of hooks", async () => {
    const provider = new MockAIProvider();
    provider.stub(
      "Topic: Playwright trace viewer",
      JSON.stringify({
        hooks: ["Only two", "hooks here"],
        body: "Full post body here.",
        cta: "",
        hashtags: [],
      })
    );

    await expect(
      generatePost(provider, {
        profession: "QA Engineer",
        pillars: ["Playwright"],
        contentStyle: "practical",
        careerGoal: "Become visible",
        topic: "Playwright trace viewer",
        whyItMatters: "Faster debugging",
        whyYou: "You use it daily",
        suggestedAngle: "Before/after",
      })
    ).rejects.toThrow();
  });
});

describe("profileAuditAgent contract", () => {
  const SCREENSHOT = { base64: "ZmFrZQ==", mediaType: "image/png" as const };

  it("rejects when no screenshots are provided", async () => {
    const provider = new MockAIProvider();

    await expect(
      auditProfileFromImages(provider, {
        profession: "QA Engineer",
        industry: "IT",
        skills: ["Playwright"],
        careerGoal: "Grow visibility",
        images: [],
      })
    ).rejects.toThrow(/at least one screenshot/);
  });

  it("returns only the sections visible in the screenshots, each with its transcribed text", async () => {
    const provider = new MockAIProvider();
    provider.stub(
      "screenshot(s) of this person's LinkedIn profile page",
      JSON.stringify({
        sections: [
          {
            section: "headline",
            original_text: "QA guy",
            score: 60,
            critique: "Too generic.",
            suggested_rewrite: "QA Automation Lead | Playwright & AI Testing",
          },
        ],
      })
    );

    const result = await auditProfileFromImages(provider, {
      profession: "QA Engineer",
      industry: "IT",
      skills: ["Playwright"],
      careerGoal: "Grow visibility",
      images: [SCREENSHOT],
    });

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.section).toBe("headline");
    expect(result.sections[0]?.original_text).toBe("QA guy");
  });

  it("rejects a section missing its transcribed original_text", async () => {
    const provider = new MockAIProvider();
    provider.stub(
      "screenshot(s) of this person's LinkedIn profile page",
      JSON.stringify({
        sections: [
          {
            section: "headline",
            original_text: "",
            score: 60,
            critique: "Too generic.",
            suggested_rewrite: "QA Automation Lead | Playwright & AI Testing",
          },
        ],
      })
    );

    await expect(
      auditProfileFromImages(provider, {
        profession: "QA Engineer",
        industry: "IT",
        skills: ["Playwright"],
        careerGoal: "Grow visibility",
        images: [SCREENSHOT],
      })
    ).rejects.toThrow();
  });

  it("passes every provided screenshot through to the provider as images", async () => {
    const provider = new MockAIProvider();
    provider.stub(
      "screenshot(s) of this person's LinkedIn profile page",
      JSON.stringify({
        sections: [
          {
            section: "headline",
            original_text: "QA guy",
            score: 60,
            critique: "Too generic.",
            suggested_rewrite: "QA Automation Lead | Playwright & AI Testing",
          },
        ],
      })
    );

    await auditProfileFromImages(provider, {
      profession: "QA Engineer",
      industry: "IT",
      skills: ["Playwright"],
      careerGoal: "Grow visibility",
      images: [SCREENSHOT, SCREENSHOT],
    });

    expect(provider.calls[0]?.options?.images).toHaveLength(2);
  });

  it("never returns a section that was not provided as pasted text", async () => {
    const provider = new MockAIProvider();
    // Agent incorrectly returns "about" even though only headline was sent —
    // this must be rejected by the contract guard, not just the schema.
    provider.stub(
      "HEADLINE:",
      JSON.stringify({
        sections: [
          {
            section: "headline",
            score: 60,
            critique: "Too generic.",
            suggested_rewrite: "QA Automation Lead | Playwright & AI Testing",
          },
          {
            section: "about",
            score: 50,
            critique: "Hallucinated — not provided.",
            suggested_rewrite: "Should not appear.",
          },
        ],
      })
    );

    await expect(
      auditProfileFromText(provider, {
        profession: "QA Engineer",
        industry: "IT",
        skills: ["Playwright"],
        careerGoal: "Grow visibility",
        headline: "QA guy",
      })
    ).rejects.toThrow(/not provided as input/);
  });

  it("accepts a pasted-text response scoped to exactly the sections provided", async () => {
    const provider = new MockAIProvider();
    provider.stub(
      "HEADLINE:",
      JSON.stringify({
        sections: [
          {
            section: "headline",
            score: 60,
            critique: "Too generic.",
            suggested_rewrite: "QA Automation Lead | Playwright & AI Testing",
          },
        ],
      })
    );

    const result = await auditProfileFromText(provider, {
      profession: "QA Engineer",
      industry: "IT",
      skills: ["Playwright"],
      careerGoal: "Grow visibility",
      headline: "QA guy",
    });

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.section).toBe("headline");
  });
});
