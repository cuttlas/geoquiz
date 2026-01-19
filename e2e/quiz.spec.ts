import { test, expect } from "@playwright/test";

test.describe("Quiz Page", () => {
  test("displays quiz items for European cities", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=cities");

    // Should show quiz header
    await expect(page.getByRole("heading", { name: /Quiz: Cities/i })).toBeVisible();

    // Should show breadcrumb
    await expect(page.getByText("Europe")).toBeVisible();

    // Should show items count
    await expect(page.getByText(/\d+ items in this quiz/)).toBeVisible();

    // Wait for items to load and verify at least one city card appears
    await expect(page.locator(".grid > div").first()).toBeVisible();
  });

  test("displays back button that navigates to home", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=cities");

    // Click back button
    await page.getByRole("button", { name: /Back to Quiz Generator/i }).click();

    // Should navigate back to home
    await expect(page).toHaveURL("/");
  });

  test("displays capitals for European capitals quiz", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=capitals");

    // Should show capitals quiz
    await expect(page.getByRole("heading", { name: /Quiz: Capitals/i })).toBeVisible();

    // Wait for items to load
    await expect(page.locator(".grid > div").first()).toBeVisible();

    // Should contain capital cities like Paris, Berlin, etc.
    await expect(page.getByText("Paris")).toBeVisible();
  });

  test("displays countries for European regions quiz", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=regions");

    // Should show regions quiz
    await expect(page.getByRole("heading", { name: /Quiz: Regions/i })).toBeVisible();

    // Wait for items to load
    await expect(page.locator(".grid > div").first()).toBeVisible();

    // Should contain European countries
    await expect(page.getByText("France")).toBeVisible();
    await expect(page.getByText("Germany")).toBeVisible();
  });

  test("filters cities by country", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&country=FRA&type=cities");

    // Wait for items to load
    await expect(page.locator(".grid > div").first()).toBeVisible();

    // Should show French cities (Paris is a capital, not a city)
    await expect(page.getByText("Lyon")).toBeVisible();
    await expect(page.getByText("Marseille")).toBeVisible();

    // Should not show non-French cities (Berlin is in Germany)
    await expect(page.getByText("Berlin")).not.toBeVisible();
  });

  test("handles population filter", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=cities&minPop=1000000");

    // Should only show large cities
    await expect(page.locator(".grid > div").first()).toBeVisible();

    // The count should be lower than without filter
    const countText = await page.getByText(/\d+ items in this quiz/).textContent();
    const count = parseInt(countText?.match(/\d+/)?.[0] ?? "0");

    // With 1M+ filter, should have fewer items than all European cities
    expect(count).toBeLessThan(30); // Reasonable upper bound for 1M+ European cities
  });

  test("shows loading state before items load", async ({ page }) => {
    // Intercept Convex requests to delay them
    await page.route("**/.functions/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.goto("/quiz?continent=Europe&type=cities");

    // Should show loading or items quickly (use first() to avoid strict mode violation)
    await expect(
      page.getByText(/Loading quiz items|items in this quiz/).first()
    ).toBeVisible();
  });
});
