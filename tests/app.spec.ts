import { test, expect } from "@playwright/test";

// ============================================================
// HOMEPAGE TESTS
// ============================================================

test.describe("Homepage", () => {
  test("loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await expect(page).toHaveTitle(/PlanView|Planning/i);
    expect(errors).toEqual([]);
  });

  test("has a search bar", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="address" i], input[placeholder*="search" i]');
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
  });

  test("no console errors on load", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForTimeout(2000);
    // Filter out known non-critical errors
    const realErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("hydration") && !e.includes("Download the React DevTools")
    );
    expect(realErrors).toEqual([]);
  });

  test("search input accepts text", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="address" i], input[placeholder*="search" i]').first();
    await searchInput.fill("123 George Street Sydney");
    await expect(searchInput).toHaveValue("123 George Street Sydney");
  });

  test("search shows autocomplete suggestions", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="address" i], input[placeholder*="search" i]').first();
    await searchInput.fill("10 George Street Sydney");
    // Wait for suggestions to appear
    await page.waitForTimeout(2000);
    const suggestions = page.locator('[class*="suggestion"], [class*="dropdown"], [role="listbox"], [role="option"], li');
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ============================================================
// ADDRESS PAGE TESTS (Direct URL navigation)
// ============================================================

test.describe("Address Page - Direct URL", () => {
  // Use Sydney Opera House coords as test address
  const testUrl = "/address?lat=-33.8568&lng=151.2153&q=1+Macquarie+Street+Sydney+NSW+2000";

  test("loads and shows spinner then content", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(testUrl);
    
    // Should show either spinner or content within 15s
    await page.waitForSelector('[class*="animate-spin"], [id="summary"], [class*="motion"]', { timeout: 15000 });
    
    // Wait for content to appear (max 20s)
    await page.waitForSelector('[id="summary"], section', { timeout: 20000 });
    
    expect(errors).toEqual([]);
  });

  test("displays zone/planning information", async ({ page }) => {
    await page.goto(testUrl);
    await page.waitForSelector('[id="summary"], section', { timeout: 20000 });
    
    // Should show some planning content
    const pageContent = await page.textContent("body");
    // Check for common planning terms
    const hasPlanningContent = pageContent?.match(/zone|R[234]|B[12]|IN|MU|residential|commercial/i);
    expect(hasPlanningContent).toBeTruthy();
  });

  test("map renders", async ({ page }) => {
    await page.goto(testUrl);
    await page.waitForSelector('[id="summary"]', { timeout: 20000 });
    
    // Look for Leaflet map container
    const map = page.locator('.leaflet-container, [id="map"]');
    await expect(map.first()).toBeVisible({ timeout: 10000 });
  });

  test("map has markers", async ({ page }) => {
    await page.goto(testUrl);
    await page.waitForSelector('[id="summary"]', { timeout: 20000 });
    await page.waitForTimeout(3000); // Let markers load
    
    const markers = page.locator('.leaflet-marker-icon');
    const count = await markers.count();
    expect(count).toBeGreaterThan(0); // At least the search marker
  });

  test("connectivity card loads", async ({ page }) => {
    await page.goto(testUrl);
    await page.waitForSelector('[id="summary"]', { timeout: 20000 });
    
    // Should have connectivity section with a score
    const connectivity = page.locator('text=/connectivity|score|\\d+\\/10/i');
    // Give it time since connectivity fetches from Overpass
    await page.waitForTimeout(10000);
    const connText = await page.textContent("body");
    const hasScoreOrLoading = connText?.match(/\/10|score|loading|connectivity/i);
    expect(hasScoreOrLoading).toBeTruthy();
  });

  test("HDA card loads or shows empty state", async ({ page }) => {
    await page.goto(testUrl);
    await page.waitForSelector('[id="summary"]', { timeout: 20000 });
    await page.waitForTimeout(5000);
    
    const body = await page.textContent("body");
    const hasHDA = body?.match(/HDA|Housing Delivery|projects?|No.*projects/i);
    expect(hasHDA).toBeTruthy();
  });

  test("nearby activity card loads", async ({ page }) => {
    await page.goto(testUrl);
    await page.waitForSelector('[id="summary"]', { timeout: 20000 });
    await page.waitForTimeout(5000);
    
    const body = await page.textContent("body");
    // Should show DA/CDC tabs or content
    const hasActivity = body?.match(/DA|CDC|CC|Development|Application|Certificate/i);
    expect(hasActivity).toBeTruthy();
  });

  test("no uncaught JS errors during full load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    
    await page.goto(testUrl);
    await page.waitForSelector('[id="summary"]', { timeout: 20000 });
    await page.waitForTimeout(8000); // Wait for all slow APIs
    
    expect(errors).toEqual([]);
  });

  test("perception card loads", async ({ page }) => {
    await page.goto(testUrl);
    await page.waitForSelector('[id="summary"]', { timeout: 20000 });
    await page.waitForTimeout(8000);
    
    const body = await page.textContent("body");
    const hasPerception = body?.match(/perception|sentiment|invest|highlights|concerns/i);
    expect(hasPerception).toBeTruthy();
  });
});

// ============================================================
// NAVIGATION TESTS
// ============================================================

test.describe("Navigation", () => {
  test("SSDA page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/ssda");
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(100);
  });

  test("login page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/login");
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });

  test("search page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/search");
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });

  test("admin page redirects or loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    const response = await page.goto("/admin");
    // Should either load or redirect to login
    expect(response?.status()).toBeLessThan(500);
    expect(errors).toEqual([]);
  });
});

// ============================================================
// API ENDPOINT TESTS (without auth - expect 401 or valid response)
// ============================================================

test.describe("API Endpoints", () => {
  const apis = [
    { name: "planning", url: "/api/planning?lat=-33.8568&lng=151.2153" },
    { name: "hazard", url: "/api/hazard?lat=-33.8568&lng=151.2153" },
    { name: "cadastre", url: "/api/cadastre?lat=-33.8568&lng=151.2153" },
    { name: "lga", url: "/api/lga?lat=-33.8568&lng=151.2153" },
    { name: "hda", url: "/api/hda?address=1+George+Street+Sydney&lat=-33.8568&lng=151.2153" },
    { name: "connectivity", url: "/api/connectivity?lat=-33.8568&lng=151.2153" },
    { name: "perception", url: "/api/perception?suburb=Sydney&lat=-33.8568&lng=151.2153" },
    { name: "da", url: "/api/da?lat=-33.8568&lng=151.2153" },
    { name: "cdc", url: "/api/cdc?lat=-33.8568&lng=151.2153" },
    { name: "cc", url: "/api/cc?lat=-33.8568&lng=151.2153" },
    { name: "geocode", url: "/api/geocode?q=10+George+Street+Sydney" },
  ];

  for (const api of apis) {
    test(`${api.name} API responds (200 or 401)`, async ({ request }) => {
      const response = await request.get(api.url);
      // Should either work (200) or require auth (401), never crash (500)
      expect([200, 401]).toContain(response.status());
    });
  }

  test("planning API returns valid JSON", async ({ request }) => {
    const response = await request.get("/api/planning?lat=-33.8568&lng=151.2153");
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("results");
      expect(Array.isArray(data.results)).toBe(true);
    }
  });

  test("da API returns valid JSON", async ({ request }) => {
    const response = await request.get("/api/da?lat=-33.8568&lng=151.2153");
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("results");
      expect(Array.isArray(data.results)).toBe(true);
    }
  });

  test("API handles missing params gracefully", async ({ request }) => {
    const response = await request.get("/api/planning");
    expect(response.status()).toBeLessThan(500); // Should be 400 or 401, not 500
  });

  test("API handles invalid coords", async ({ request }) => {
    const response = await request.get("/api/planning?lat=abc&lng=xyz");
    expect(response.status()).toBeLessThan(500);
  });
});

// ============================================================
// INTERACTION TESTS
// ============================================================

test.describe("User Interactions", () => {
  const testUrl = "/address?lat=-33.8568&lng=151.2153&q=1+Macquarie+Street+Sydney+NSW+2000";

  test("clicking map marker shows popup", async ({ page }) => {
    await page.goto(testUrl);
    await page.waitForSelector('[id="summary"]', { timeout: 20000 });
    await page.waitForTimeout(5000);
    
    const marker = page.locator('.leaflet-marker-icon').first();
    if (await marker.isVisible()) {
      await marker.click();
      await page.waitForTimeout(500);
      const popup = page.locator('.leaflet-popup-content');
      await expect(popup).toBeVisible({ timeout: 3000 });
    }
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/");
    
    // Find and click SSDA/Major Projects link
    const ssdaLink = page.locator('a[href*="ssda"], a:has-text("Major Projects"), a:has-text("SSDA")').first();
    if (await ssdaLink.isVisible()) {
      await ssdaLink.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain("ssda");
    }
  });

  test("theme toggle works", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    
    const themeBtn = page.locator('button:has(svg[class*="lucide"]), button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i]');
    if (await themeBtn.first().isVisible()) {
      const htmlBefore = await page.locator("html").getAttribute("class");
      await themeBtn.first().click();
      await page.waitForTimeout(500);
      const htmlAfter = await page.locator("html").getAttribute("class");
      // Class should change (dark added/removed)
      expect(htmlBefore).not.toEqual(htmlAfter);
    }
  });

  test("jump links scroll to sections", async ({ page }) => {
    await page.goto(testUrl);
    await page.waitForSelector('[id="summary"]', { timeout: 20000 });
    
    const jumpLinks = page.locator('a[href^="#"]');
    const count = await jumpLinks.count();
    expect(count).toBeGreaterThan(0);
    
    // Click the map jump link
    const mapLink = page.locator('a[href="#map"]');
    if (await mapLink.isVisible()) {
      await mapLink.click();
      await page.waitForTimeout(500);
    }
  });
});

// ============================================================
// PERFORMANCE & NETWORK TESTS
// ============================================================

test.describe("Performance", () => {
  test("homepage loads in under 5s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test("address page resolves within 15s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/address?lat=-33.8568&lng=151.2153&q=test");
    
    // Wait for either content or max 15s
    try {
      await page.waitForSelector('[id="summary"]', { timeout: 15000 });
    } catch {
      // If it didn't load in 15s, that's a bug
    }
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(15000);
  });

  test("no failed network requests (500s)", async ({ page }) => {
    const failedRequests: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 500) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });
    
    await page.goto("/address?lat=-33.8568&lng=151.2153&q=test");
    await page.waitForTimeout(12000);
    
    expect(failedRequests).toEqual([]);
  });

  test("no hanging requests after 20s", async ({ page }) => {
    const pendingRequests = new Set<string>();
    
    page.on("request", (req) => pendingRequests.add(req.url()));
    page.on("response", (res) => pendingRequests.delete(res.request().url()));
    page.on("requestfailed", (req) => pendingRequests.delete(req.url()));
    
    await page.goto("/address?lat=-33.8568&lng=151.2153&q=test");
    await page.waitForTimeout(20000);
    
    // Filter to just our API calls
    const hangingAPIs = [...pendingRequests].filter((url) => url.includes("/api/"));
    expect(hangingAPIs).toEqual([]);
  });
});

// ============================================================
// EDGE CASES
// ============================================================

test.describe("Edge Cases", () => {
  test("address page with no query params shows search", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/address");
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
    // Should still show a search bar
    const searchInput = page.locator('input[type="text"], input[type="search"]');
    await expect(searchInput.first()).toBeVisible({ timeout: 5000 });
  });

  test("address page with invalid coords doesn't crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/address?lat=0&lng=0&q=invalid");
    await page.waitForTimeout(5000);
    expect(errors).toEqual([]);
  });

  test("rapid navigation doesn't cause errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    
    await page.goto("/");
    await page.goto("/ssda");
    await page.goto("/address");
    await page.goto("/");
    await page.waitForTimeout(2000);
    
    expect(errors).toEqual([]);
  });

  test("double search doesn't break state", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    
    await page.goto("/address?lat=-33.8568&lng=151.2153&q=first+search");
    await page.waitForTimeout(2000);
    // Navigate to a different address while still loading
    await page.goto("/address?lat=-33.8833&lng=151.2167&q=second+search");
    await page.waitForTimeout(10000);
    
    expect(errors).toEqual([]);
  });
});
