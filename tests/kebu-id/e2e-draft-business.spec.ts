/**
 * Kebu ID Slice 1 E2E (optional live run).
 *
 * Requires: applied migration 005 (+006), valid Supabase auth cookie session,
 * and KEBU_E2E_BASE_URL. Skips cleanly in CI without those secrets.
 *
 *   KEBU_E2E_BASE_URL=http://localhost:3000 \
 *   KEBU_E2E_COOKIE='sb-...=...' \
 *   npx playwright test tests/kebu-id/e2e-draft-business.spec.ts
 */
import { test, expect } from "playwright/test";

const base = process.env.KEBU_E2E_BASE_URL;
const cookie = process.env.KEBU_E2E_COOKIE;

test.describe("Kebu ID draft business E2E", () => {
  test.skip(!base || !cookie, "Set KEBU_E2E_BASE_URL and KEBU_E2E_COOKIE to run live E2E");

  test("create draft → dashboard → refresh persistence", async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: base,
      extraHTTPHeaders: { Cookie: cookie! },
    });
    const page = await context.newPage();
    const key = `e2e-${crypto.randomUUID()}`;

    await page.goto("/business/new");
    await page.getByLabel(/legal|proposed/i).fill(`E2E Atelier ${Date.now()}`);
    await page.getByLabel(/country/i).selectOption("SN");
    await page.getByLabel(/category/i).selectOption("fashion");
    await page.getByLabel(/description/i).fill("E2E draft business description for Kebu ID.");

    await page.evaluate((idem) => {
      sessionStorage.setItem("kebu-e2e-idem", idem);
    }, key);

    // Prefer API for deterministic idempotency assertion, then open UI
    const create = await context.request.post("/api/businesses", {
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        Cookie: cookie!,
      },
      data: {
        legalName: `E2E API ${Date.now()}`,
        countryCode: "SN",
        category: "fashion",
        description: "Created via E2E API for persistence check.",
      },
    });
    expect(create.status()).toBeLessThan(300);
    const body = await create.json();
    const id = body.business.id as string;

    const replay = await context.request.post("/api/businesses", {
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        Cookie: cookie!,
      },
      data: {
        legalName: "Should not create another",
        countryCode: "SN",
        category: "fashion",
        description: "Replay body ignored for identity.",
      },
    });
    const replayBody = await replay.json();
    expect(replayBody.business.id).toBe(id);
    expect(replayBody.idempotent).toBe(true);

    await page.goto(`/business/${id}`);
    await expect(page.getByText(/KEBU-/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/KEBU-/)).toBeVisible();

    const other = await context.request.get(`/api/public/kebu-id/${body.business.public_kebu_id}`);
    expect(other.status()).toBe(404);

    await context.close();
  });
});
