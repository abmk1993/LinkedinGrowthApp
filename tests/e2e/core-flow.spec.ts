import { test } from "@playwright/test";
// `page` is intentionally unused for now — every step below is a
// placeholder. Re-add `{ page }` to the test callback as each step is
// implemented.

/**
 * The full MVP happy-path: sign up → profile → profile audit → photo
 * check → positioning → growth plan → research → generate post → edit
 * → publish.
 *
 * This is intentionally a skeleton with each step as a `test.step`
 * placeholder rather than a fake passing test — per the dev plan (see
 * docs/dev-plan.md, section 8), this test becomes the CI merge gate
 * once the corresponding page/route exists. Fill in each step as its
 * page ships; do not mark this suite "done" with steps still stubbed.
 *
 * Uses the mocked AI provider (see lib/ai/getProvider.ts + e2eFixtures.ts)
 * seeded for the fixed fake profile in tests/fixtures/profiles.ts.
 */
test.describe.skip("core end-to-end flow (fill in as pages ship)", () => {
  test("full happy path", async () => {
    await test.step("sign up", async () => {
      // TODO: implement once /signup exists
    });

    await test.step("complete professional profile", async () => {
      // TODO: implement once /onboarding/profile exists
    });

    await test.step("run profile audit and accept a rewrite", async () => {
      // TODO: implement once /onboarding/profile-audit exists
    });

    await test.step("run photo check", async () => {
      // TODO: implement once /onboarding/photo exists
    });

    await test.step("confirm positioning pillars", async () => {
      // TODO: implement once /onboarding/positioning exists
    });

    await test.step("set growth plan cadence", async () => {
      // TODO: implement once /onboarding/growth-plan exists
    });

    await test.step("run research and select a topic", async () => {
      // TODO: implement once /research exists
    });

    await test.step("generate, edit, and approve a post", async () => {
      // TODO: implement once /posts/[id]/edit exists
    });

    await test.step("mark the post as published", async () => {
      // TODO: implement once /posts/[id]/publish exists
    });
  });
});
