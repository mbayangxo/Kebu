/**
 * May Lècor — real SiteRenderer regression via the dev-only fixture route.
 *
 * Unlike e2e-maylecor-regression.spec.ts (inline HTML approximation), this drives
 * the ACTUAL SiteRenderer component through app/create/demo/maylecor-fixture, which
 * needs no Supabase auth/DB (the template definition is pure source-controlled data;
 * see that route's own docstring for why it's safe to keep non-production-only).
 *
 * Start the server first: `npm run dev`, then `KEBU_E2E_BASE_URL=http://localhost:3000`.
 * Skips cleanly if no dev server is reachable.
 */
import { test, expect } from "playwright/test";

const BASE_URL = process.env.KEBU_E2E_BASE_URL ?? "http://localhost:3000";
const FIXTURE = `${BASE_URL}/create/demo/maylecor-fixture`;

const PAGES = [
  "home", "shop", "updates", "mays-world", "about", "press", "contact",
  "mayjor-good", "music", "videos", "audio", "maygazine", "may-by-may",
] as const;

async function isServerUp() {
  try {
    const res = await fetch(`${FIXTURE}?page=home`, { signal: AbortSignal.timeout(3000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

test.describe("May Lècor fixture — real component regression", () => {
  test.beforeAll(async () => {
    if (!(await isServerUp())) test.skip(true, `No dev server at ${BASE_URL} — start one with npm run dev`);
  });

  for (const slug of PAGES) {
    test(`${slug}: no horizontal overflow, no console errors, no owner-instruction leaks at phone width`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const consoleErrors: string[] = [];
      page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });

      const resp = await page.goto(`${FIXTURE}?page=${slug}`, { waitUntil: "networkidle", timeout: 20_000 });
      expect(resp?.status()).toBe(200);

      const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
      expect(overflow, `${slug} overflows horizontally at 390px`).toBe(false);

      const leaks = await page.evaluate(() => {
        const text = document.body.innerText;
        const needles = ["in the editor", "in Content", "Media library", "left rail", "Replace this with", "add as many clips"];
        return needles.filter((n) => text.includes(n));
      });
      expect(leaks, `${slug} leaks owner-facing builder copy to visitors`).toEqual([]);
      expect(consoleErrors, `${slug} logged console errors`).toEqual([]);
    });
  }

  test("there is no standalone Photos page or nav entry — Maygazine carries the galleries", async ({ page }) => {
    await page.goto(`${FIXTURE}?page=photos`, { waitUntil: "networkidle" });
    // The fixture falls back to "home" for an unknown page slug.
    expect(await page.evaluate(() => document.querySelector("[data-fixture-page]")?.getAttribute("data-fixture-page"))).toBe("home");

    await page.goto(`${FIXTURE}?page=maygazine`, { waitUntil: "networkidle" });
    const imgs = await page.evaluate(() => Array.from(document.querySelectorAll("img")).map((i) => i.src));
    expect(imgs.some((src) => src.includes("yaw-laa-taan-cover"))).toBe(true);
    expect(imgs.some((src) => src.includes("press-photoshoot"))).toBe(true);
  });

  test("Videos page plays exactly one real video, no broken placeholder cards", async ({ page }) => {
    await page.goto(`${FIXTURE}?page=videos`, { waitUntil: "networkidle" });
    const videos = await page.evaluate(() =>
      Array.from(document.querySelectorAll("video")).map((v) => v.currentSrc || v.src),
    );
    expect(videos).toHaveLength(1);
    expect(videos[0]).toContain("/templates/maylecor/yaw-laa-taan-demo.mp4");
    const strayPlaceholders = await page.evaluate(() =>
      Array.from(document.querySelectorAll("*")).filter(
        (el) => ["Video 2", "Video 3", "Video 4"].includes(el.textContent?.trim() ?? ""),
      ).length,
    );
    expect(strayPlaceholders).toBe(0);
  });

  test("Music page shows the real \"Yaw Laa Taan\" track, no dead soundcloud.com/maylecor link, no fake extra tracks", async ({ page }) => {
    await page.goto(`${FIXTURE}?page=music`, { waitUntil: "networkidle" });
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toContain("Yaw Laa Taan");
    expect(text).not.toContain("Track 2");
    const links = await page.evaluate(() => Array.from(document.querySelectorAll("a[href]")).map((a) => a.getAttribute("href") ?? ""));
    expect(links.some((href) => href.includes("soundcloud.com/maylecor"))).toBe(false);
  });

  test("Contact page still carries the existing working form (name, email, enquiry type, message)", async ({ page }) => {
    await page.goto(`${FIXTURE}?page=contact`, { waitUntil: "networkidle" });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator("textarea")).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
    await expect(page.getByRole("button", { name: "Send enquiry" })).toBeVisible();
  });
});
