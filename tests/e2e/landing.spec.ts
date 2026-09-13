import { test, expect } from "@playwright/test";

test.describe("landing page", () => {
  test("shows the core promise and a working CTA", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /turn your professional knowledge into visibility/i })
    ).toBeVisible();

    const cta = page.getByRole("link", { name: /start growing my professional presence/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/signup");
  });

  test("explains both phases of the product", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Profile makeover")).toBeVisible();
    await expect(page.getByText("Ongoing growth mode")).toBeVisible();
  });
});
