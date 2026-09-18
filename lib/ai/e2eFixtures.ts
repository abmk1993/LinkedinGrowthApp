import { MockAIProvider } from "./mockProvider";

/**
 * Seeds the mock provider with fixed responses for the E2E happy-path
 * test's fixed fake profile (see tests/fixtures/profiles.ts — the
 * "Albert-like QA profile"). Keep the match substrings loose enough to
 * survive small prompt wording changes, but specific enough not to
 * cross-match another agent's prompt.
 *
 * MockAIProvider returns the FIRST stub whose substring matches, and
 * most agent prompts open with the same "Profession: ..." line — so
 * each stub keys on a line only its own agent's prompt contains.
 */
export function seedE2EStubs(provider: MockAIProvider): void {
  // Positioning is the only prompt with an "Experience level:" line.
  provider.stub(
    "Experience level:",
    JSON.stringify({
      pillars: ["AI Testing", "Playwright", "QA Leadership", "Test Automation"],
      target_audience: "QA engineers and test automation leads exploring AI tooling",
      content_style: "practical, first-person, example-driven",
    })
  );

  provider.stub(
    "screenshot(s) of this person's LinkedIn profile page",
    JSON.stringify({
      sections: [
        {
          section: "headline",
          original_text: "QA Automation Engineer at Sportsbook Co",
          score: 55,
          critique:
            "Reads as a job title only — doesn't signal your Playwright/AI-testing focus or invite engagement.",
          suggested_rewrite:
            "QA Automation Engineer & Team Lead | Playwright, AI-Assisted Testing, Sportsbook Platforms",
        },
      ],
    })
  );

  // Paste-text audit. Only a headline is stubbed, so the test must paste
  // only a headline — the agent rejects sections that weren't provided.
  provider.stub(
    "HEADLINE:\n",
    JSON.stringify({
      sections: [
        {
          section: "headline",
          score: 55,
          critique:
            "Reads as a job title only — doesn't signal your Playwright/AI-testing focus or invite engagement.",
          suggested_rewrite:
            "QA Automation Engineer & Team Lead | Playwright, AI-Assisted Testing, Sportsbook Platforms",
        },
      ],
    })
  );

  // Scores above PHOTO_SCORE_THRESHOLD with no issues, so the flow never
  // reaches the Gemini correction step.
  provider.stub(
    "Review the attached headshot image",
    JSON.stringify({
      score: 90,
      critique: "Well-lit, centered head-and-shoulders framing on a plain background.",
      issues: [],
    })
  );

  provider.stub(
    "Pillar to focus on:",
    JSON.stringify({
      items: [
        {
          topic: "Playwright trace viewer adds step-through DOM snapshots",
          why_it_matters:
            "Debugging flaky E2E failures without re-running them cuts triage time for every QA team.",
          why_you:
            "You run Playwright against timing-sensitive sportsbook flows, where flake is a daily cost.",
          suggested_angle:
            "Show how stepping through a trace replaced your re-run-five-times debugging loop.",
          source_name: "Playwright release notes",
          source_url: "https://playwright.dev/docs/release-notes",
          category: "post_opportunity",
        },
      ],
    })
  );

  provider.stub(
    "Topic:",
    JSON.stringify({
      hooks: [
        "Most flaky E2E tests aren't flaky. They're just badly waited-for.",
        "I stopped debugging Playwright failures by staring at logs. Here's what changed.",
        "The trace viewer update quietly fixed my team's biggest QA complaint.",
      ],
      body:
        "Playwright's new trace viewer capability changes how our team debugs failures. Instead of re-running a flaky test five times, we now step through the exact DOM state at each action. For a sportsbook platform where timing-sensitive odds updates cause real flake, this cut our triage time meaningfully.",
      cta: "If your team fights flaky E2E tests, what's your current debugging loop?",
      hashtags: ["#QA", "#Playwright", "#TestAutomation"],
    })
  );
}
