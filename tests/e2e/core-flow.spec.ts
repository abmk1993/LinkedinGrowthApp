import { test, expect as baseExpect, type Page } from "@playwright/test";
import sharp from "sharp";
import { QA_PROFILE } from "../fixtures/profiles";

/**
 * The full MVP happy-path: guest sign-in → profile → profile audit →
 * photo check → positioning → growth plan → research → generate post →
 * edit → publish.
 *
 * Uses the mocked AI + search providers (see lib/ai/getProvider.ts,
 * lib/ai/e2eFixtures.ts, lib/search/getProvider.ts) seeded for the
 * fixed fake profile in tests/fixtures/profiles.ts. Supabase is real:
 * each run creates a fresh anonymous user, so "Anonymous Sign-Ins" must
 * be enabled and the profile-photos bucket must exist (see README).
 */

// Every step waits on a real Supabase round-trip, plus a route compile
// on a cold dev server — the 5s default is too tight for either.
const expect = baseExpect.configure({ timeout: 30_000 });

async function addTags(page: Page, label: string, tags: string[]) {
  const input = page.getByLabel(label);
  for (const tag of tags) {
    await input.fill(tag);
    await input.press("Enter");
  }
}

async function headshotJpeg(): Promise<Buffer> {
  return sharp({
    create: { width: 400, height: 400, channels: 3, background: { r: 140, g: 155, b: 176 } },
  })
    .jpeg()
    .toBuffer();
}

test.describe("core end-to-end flow", () => {
  test("full happy path", async ({ page }) => {
    // The dev server compiles each route on first hit, which dominates
    // the runtime of a cold run.
    test.setTimeout(240_000);
    page.setDefaultNavigationTimeout(60_000);
    page.setDefaultTimeout(30_000);

    await test.step("sign in as a guest", async () => {
      await page.goto("/");
      await page.getByRole("button", { name: /try it without an account/i }).click();
      await expect(page).toHaveURL(/\/onboarding\/profile$/);
    });

    await test.step("complete professional profile", async () => {
      await page.getByLabel("Profession").fill(QA_PROFILE.profession);
      await page.getByLabel("Industry").fill(QA_PROFILE.industry);
      const experience = page.getByRole("combobox", { name: "Experience level" });
      await experience.click();
      await expect(experience).toHaveAttribute("aria-expanded", "true");
      await page.getByRole("option", { name: "Senior (6-10 years)" }).click();
      await expect(experience).toHaveAttribute("aria-expanded", "false");
      await expect(experience).toContainText("Senior (6-10 years)");
      await addTags(page, "Skills", QA_PROFILE.skills);
      await addTags(page, "Topics of interest", QA_PROFILE.interests);
      await page.getByLabel("Career goal").fill(QA_PROFILE.careerGoal);
      await page.getByRole("button", { name: /continue to profile audit/i }).click();
      await expect(page).toHaveURL(/\/onboarding\/profile-audit$/);
    });

    await test.step("run profile audit and accept a rewrite", async () => {
      await page.getByRole("button", { name: "Paste text instead" }).click();
      // Only the headline is stubbed — see the "HEADLINE:" stub in e2eFixtures.ts.
      await page.locator("textarea").first().fill("QA Engineer at BetCorp | Testing things");
      await page.getByRole("button", { name: /analyze my profile/i }).click();

      await expect(page.getByText("Score: 55/100")).toBeVisible();
      await page.getByRole("button", { name: "Accept" }).click();
      await expect(page.getByText("Saved")).toBeVisible();

      // The audit and the decision survive a reload — no second analysis.
      await page.reload();
      await expect(page.getByText("Score: 55/100")).toBeVisible();
      await expect(page.getByText("Saved")).toBeVisible();

      await page.getByRole("button", { name: /continue to photo check/i }).click();
      await expect(page).toHaveURL(/\/onboarding\/photo$/);
    });

    await test.step("run photo check", async () => {
      // Optional step — skippable before anything is uploaded.
      await expect(page.getByRole("button", { name: /skip photo check for now/i })).toBeVisible();

      await page.locator("input[type=file]").setInputFiles({
        name: "headshot.jpg",
        mimeType: "image/jpeg",
        buffer: await headshotJpeg(),
      });
      await page.getByRole("button", { name: /analyze this photo/i }).click();

      await expect(page.getByText("Score: 90/100")).toBeVisible();

      await page.reload();
      await expect(page.getByText("Score: 90/100")).toBeVisible();

      await page.getByRole("button", { name: /continue to positioning/i }).click();
      await expect(page).toHaveURL(/\/onboarding\/positioning$/);
    });

    await test.step("confirm positioning pillars", async () => {
      await page.getByRole("button", { name: /generate my pillars/i }).click();
      await expect(page.getByText("QA Leadership")).toBeVisible();
      await page.getByRole("button", { name: /save and continue/i }).click();
      await expect(page).toHaveURL(/\/onboarding\/growth-plan$/);
    });

    await test.step("set growth plan cadence", async () => {
      await page.getByRole("button", { name: /^weekly/i }).click();
      await page.getByRole("button", { name: /start growing/i }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByText("Currently posting:")).toContainText("Weekly");
    });

    await test.step("run research and select a topic", async () => {
      await page.getByRole("button", { name: /run research/i }).click();
      await expect(page).toHaveURL(/\/research$/);

      await page.getByRole("link", { name: /playwright trace viewer adds step-through/i }).click();
      await expect(page).toHaveURL(/\/research\/[\w-]+$/);
    });

    await test.step("generate, edit, and approve a post", async () => {
      await page.getByRole("button", { name: /generate post/i }).click();
      await expect(page).toHaveURL(/\/posts\/[\w-]+\/edit$/);

      const body = page.locator("textarea").first();
      await expect(body).toHaveValue(/trace viewer capability/);
      await body.fill(`${await body.inputValue()}\n\nEdited during E2E.`);

      await page.getByRole("button", { name: /I stopped debugging Playwright failures/ }).click();
      // Punctuation would break the tag on LinkedIn — it's saved as #CICD.
      await addTags(page, "Hashtags", ["CI/CD"]);
      await page.getByRole("button", { name: /approve and continue/i }).click();
      await expect(page).toHaveURL(/\/posts\/[\w-]+\/publish$/);

      // What gets copied opens with the chosen hook, not mid-body.
      const postText = page.getByTestId("post-text");
      await expect(postText).toContainText(
        /^I stopped debugging Playwright failures by staring at logs\. Here's what changed\.\s+Playwright's new trace viewer/
      );
      await expect(postText).toContainText("Edited during E2E.");
      await expect(postText).toContainText("#QA #Playwright #TestAutomation #CICD");
    });

    await test.step("mark the post as published", async () => {
      await page.getByRole("button", { name: /mark as published/i }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByText("Published", { exact: true }).locator("xpath=..")).toContainText(
        "1"
      );
    });
  });
});
