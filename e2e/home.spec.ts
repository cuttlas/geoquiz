import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("displays the GeoQuiz title and description", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "GeoQuiz" })).toBeVisible();
    await expect(
      page.getByText("Test your geography knowledge")
    ).toBeVisible();
  });

  test("displays the logo", async ({ page }) => {
    await page.goto("/");

    const logo = page.getByAltText("GeoQuiz");
    await expect(logo).toBeVisible();
  });
});
