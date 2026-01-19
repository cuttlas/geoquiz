import { test, expect } from "@playwright/test";

test.describe("Quiz Selector", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays continent dropdown", async ({ page }) => {
    await expect(page.getByText("Continent", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox").first()).toBeVisible();
  });

  test("displays quiz type buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: "cities" })).toBeVisible();
    await expect(page.getByRole("button", { name: "capitals" })).toBeVisible();
    await expect(page.getByRole("button", { name: "regions" })).toBeVisible();
  });

  test("displays generate button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Generate Quiz/i })
    ).toBeVisible();
  });

  test("generate button is disabled without continent selection", async ({
    page,
  }) => {
    const generateButton = page.getByRole("button", { name: /Generate Quiz/i });
    await expect(generateButton).toBeDisabled();
  });

  test("selecting continent enables further selection", async ({ page }) => {
    // Click continent dropdown
    await page.getByRole("combobox").first().click();

    // Select Europe
    await page.getByRole("option", { name: "Europe" }).click();

    // Should now see country dropdown
    await expect(page.getByText("Country (optional)")).toBeVisible();
  });

  test("population filter appears when cities type is selected", async ({
    page,
  }) => {
    // Cities is selected by default, so population filter should be visible
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Europe" }).click();

    // Click cities button to ensure it's active
    await page.getByRole("button", { name: "cities" }).click();

    // Should see population filter
    await expect(page.getByText("Minimum Population")).toBeVisible();
  });

  test("population filter hides when capitals type is selected", async ({
    page,
  }) => {
    // Select a continent first
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Europe" }).click();

    // Switch to capitals
    await page.getByRole("button", { name: "capitals" }).click();

    // Population filter should not be visible
    await expect(page.getByText("Minimum Population")).not.toBeVisible();
  });

  test("navigates to quiz page on generate", async ({ page }) => {
    // Select Europe
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Europe" }).click();

    // Wait for item count to load (button text changes from "(0 items)" to a positive number)
    const generateButton = page.getByRole("button", { name: /Generate Quiz/i });
    await expect(generateButton).not.toHaveText(/\(0 items\)/);

    // Click generate
    await generateButton.click();

    // Should navigate to quiz page
    await expect(page).toHaveURL(/\/quiz/);
    expect(page.url()).toContain("continent=Europe");
    expect(page.url()).toContain("type=cities");
  });

  test("cascading dropdowns reset when parent changes", async ({ page }) => {
    // Select Europe
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Europe" }).click();

    // Select a country
    await page.getByText("Country (optional)").click();
    await page
      .locator('[role="combobox"]')
      .nth(1)
      .click();
    await page.getByRole("option", { name: "France" }).click();

    // Should see region dropdown for France
    await expect(page.getByText("Région (optional)")).toBeVisible();

    // Change continent to Asia
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Asia" }).click();

    // France-specific dropdown should be gone
    await expect(page.getByText("Région (optional)")).not.toBeVisible();
  });
});
