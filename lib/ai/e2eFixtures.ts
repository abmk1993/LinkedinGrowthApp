import { MockAIProvider } from "./mockProvider";

/**
 * Seeds the mock provider with fixed responses for the E2E happy-path
 * test's fixed fake profile (see tests/fixtures/profiles.ts — the
 * "Albert-like QA profile"). Keep the match substrings loose enough to
 * survive small prompt wording changes, but specific enough not to
 * cross-match another agent's prompt.
 */
export function seedE2EStubs(provider: MockAIProvider): void {
  provider.stub(
    "Profession: QA Automation Engineer",
    JSON.stringify({
      pillars: ["AI Testing", "Playwright", "QA Leadership", "Test Automation"],
      target_audience: "QA engineers and test automation leads exploring AI tooling",
      content_style: "practical, first-person, example-driven",
    })
  );

  provider.stub(
    "HEADLINE:",
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
