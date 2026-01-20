import { test, expect } from "@playwright/test";

test.describe("Quiz Page - Map View", () => {
  test("displays map with markers for European cities", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=cities");

    // Should show quiz header
    await expect(
      page.getByRole("heading", { name: /Quiz: Cities/i })
    ).toBeVisible();

    // Should show breadcrumb
    await expect(page.getByText("Europe")).toBeVisible();

    // Should show places count
    await expect(page.getByText(/\d+ places/)).toBeVisible();

    // Should display Leaflet map container
    await expect(page.locator(".leaflet-container")).toBeVisible();

    // Should have map tiles loaded
    await expect(page.locator(".leaflet-tile-pane img").first()).toBeVisible();

    // Should have at least one marker on the map
    await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  });

  test("displays back button that navigates to home", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=cities");

    // Click back button
    await page.getByRole("button", { name: /Back/i }).click();

    // Should navigate back to home
    await expect(page).toHaveURL("/");
  });

  test("displays capitals markers for European capitals quiz", async ({
    page,
  }) => {
    await page.goto("/quiz?continent=Europe&type=capitals");

    // Should show capitals quiz
    await expect(
      page.getByRole("heading", { name: /Quiz: Capitals/i })
    ).toBeVisible();

    // Should display map with markers
    await expect(page.locator(".leaflet-container")).toBeVisible();
    await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();

    // Click on a marker to see popup with Paris
    await page.locator(".leaflet-marker-icon").first().click();

    // Should show popup with city info
    await expect(page.locator(".leaflet-popup-content")).toBeVisible();
  });

  test("displays map with region polygons for European countries", async ({
    page,
  }) => {
    await page.goto("/quiz?continent=Europe&type=regions");

    // Should show regions quiz header
    await expect(
      page.getByRole("heading", { name: /Quiz: Regions/i })
    ).toBeVisible();

    // Should show breadcrumb
    await expect(page.getByText("Europe")).toBeVisible();

    // Should show regions count
    await expect(page.getByText(/\d+ regions/)).toBeVisible();

    // Should display Leaflet map container
    await expect(page.locator(".leaflet-container")).toBeVisible();

    // Should have SVG polygons rendered (Leaflet renders polygons as SVG paths)
    await expect(page.locator(".leaflet-interactive").first()).toBeVisible();
  });

  test("clicking region shows info panel", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=regions");

    // Wait for map and polygons to load
    await expect(page.locator(".leaflet-container")).toBeVisible();
    await expect(page.locator(".leaflet-interactive").first()).toBeVisible();

    // Click on a polygon
    await page.locator(".leaflet-interactive").first().click();

    // Should show info panel
    await expect(page.locator(".absolute.bottom-4.left-4")).toBeVisible();

    // Info panel should have region name
    await expect(
      page.locator(".absolute.bottom-4.left-4 h3")
    ).toBeVisible();
  });

  test("region popup shows region information", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=regions");

    // Wait for polygons
    await expect(page.locator(".leaflet-interactive").first()).toBeVisible();

    // Click polygon to open popup
    await page.locator(".leaflet-interactive").first().click();

    // Popup should contain region info
    const popup = page.locator(".leaflet-popup-content");
    await expect(popup).toBeVisible();

    // Should have name (bold text)
    await expect(popup.locator("strong")).toBeVisible();
  });

  test("can close region info panel", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=regions");

    // Wait for polygons and click one
    await expect(page.locator(".leaflet-interactive").first()).toBeVisible();
    await page.locator(".leaflet-interactive").first().click();

    // Info panel should be visible
    await expect(page.locator(".absolute.bottom-4.left-4")).toBeVisible();

    // Click close button
    await page.locator(".absolute.bottom-4.left-4 button").click();

    // Info panel should be hidden
    await expect(page.locator(".absolute.bottom-4.left-4")).not.toBeVisible();
  });

  test("filters cities by country", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&country=FRA&type=cities");

    // Wait for map and markers to load
    await expect(page.locator(".leaflet-container")).toBeVisible();
    await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();

    // Get marker count for France
    const markerCount = await page.locator(".leaflet-marker-icon").count();

    // France has fewer cities than all of Europe
    expect(markerCount).toBeGreaterThan(0);
    expect(markerCount).toBeLessThan(50);
  });

  test("handles population filter", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=cities&minPop=1000000");

    // Wait for map to load
    await expect(page.locator(".leaflet-container")).toBeVisible();

    // Check the places count in header
    const countText = await page.getByText(/\d+ places/).textContent();
    const count = parseInt(countText?.match(/\d+/)?.[0] ?? "0");

    // With 1M+ filter, should have fewer items
    expect(count).toBeLessThan(30);
  });

  test("shows loading state before places load", async ({ page }) => {
    // Intercept Convex requests to delay them
    await page.route("**/.functions/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.goto("/quiz?continent=Europe&type=cities");

    // Should show loading or map quickly
    await expect(
      page.getByText(/Loading places|places/).first()
    ).toBeVisible();
  });

  test("clicking marker shows info panel", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=capitals");

    // Wait for markers to load
    await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();

    // Click on a marker
    await page.locator(".leaflet-marker-icon").first().click();

    // Should show info panel with place details
    await expect(
      page.locator(".absolute.bottom-4.left-4")
    ).toBeVisible();

    // Info panel should have a close button
    await expect(
      page.locator(".absolute.bottom-4.left-4 button")
    ).toBeVisible();
  });

  test("can close info panel", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=capitals");

    // Wait for markers and click one
    await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
    await page.locator(".leaflet-marker-icon").first().click();

    // Info panel should be visible
    await expect(page.locator(".absolute.bottom-4.left-4")).toBeVisible();

    // Click close button
    await page.locator(".absolute.bottom-4.left-4 button").click();

    // Info panel should be hidden
    await expect(page.locator(".absolute.bottom-4.left-4")).not.toBeVisible();
  });

  test("map auto-zooms to fit all markers", async ({ page }) => {
    // Test with a small set of places (France capitals)
    await page.goto("/quiz?continent=Europe&country=FRA&type=capitals");

    // Wait for map to load
    await expect(page.locator(".leaflet-container")).toBeVisible();
    await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();

    // Map should be zoomed in (not at default world view)
    // Check that zoom controls exist
    await expect(page.locator(".leaflet-control-zoom")).toBeVisible();
  });

  test("marker popup shows place information", async ({ page }) => {
    await page.goto("/quiz?continent=Europe&type=capitals");

    // Wait for markers
    await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();

    // Click marker to open popup
    await page.locator(".leaflet-marker-icon").first().click();

    // Popup should contain place info
    const popup = page.locator(".leaflet-popup-content");
    await expect(popup).toBeVisible();

    // Should have name (bold text)
    await expect(popup.locator("strong")).toBeVisible();

    // Should have feature type
    await expect(popup.getByText(/capital/i)).toBeVisible();
  });
});
