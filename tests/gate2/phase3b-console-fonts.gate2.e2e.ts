/**
 * Phase 3B — happy paths are console-clean and theme typography actually loads.
 *
 * The app's CSP (style-src 'self' 'unsafe-inline') forbids third-party stylesheets, so any
 * runtime Google Fonts <link>/@import is blocked: it logs a console error AND the theme font
 * silently falls back. This spec uses a theme with Google-hosted families (Fraunces display,
 * Inter body) and requires, on the Builder and on the published page at Desktop/Tablet/Phone:
 *   • zero console errors and page errors;
 *   • the theme's display and body faces are actually loaded and used by the page.
 *
 * QA-only (tests/gate2/fixtures.ts guards); synthetic data is removed and verified in afterAll.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Browser, type Page } from "playwright/test";
import {
  APP_URL,
  assertQaOnly,
  cleanupGate2,
  createIdentity,
  headingFor,
  seedProjectAsOwner,
  svc,
  type Identity,
  type SeededProject,
} from "./fixtures";

const OUT = process.env.GATE2_OUTPUT_DIR ?? "./.gate2-results";
const PREFIX = "G2F-";
const THEME = {
  primary: "#0F0D33",
  accent: "#00C851",
  background: "#FAFAF8",
  text: "#0F0D33",
  fontDisplay: "Fraunces",
  fontBody: "Inter",
  spacing: "comfortable",
  headingScale: "md",
  bodySize: "md",
  letterSpacing: "normal",
};
const evidence: Record<string, unknown> = {};
let owner: Identity;
let seed: SeededProject;

function watchConsole(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console.error: ${m.text().slice(0, 300)}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message.slice(0, 300)}`));
  return problems;
}

async function signIn(page: Page, who: Identity, projectId: string) {
  await page.goto(`/login?next=${encodeURIComponent(`/create/${projectId}`)}`, { waitUntil: "networkidle" });
  await expect(async () => {
    await page.locator('input[type="email"]').fill(who.email);
    await page.locator('input[type="password"]').fill(who.password);
    await expect(page.locator('input[type="email"]')).toHaveValue(who.email, { timeout: 1_000 });
    await expect(page.locator('input[type="password"]')).toHaveValue(who.password, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`**/create/${projectId}**`, { timeout: 90_000 });
}

/** Loaded font faces for the theme families, and the family the hero heading renders with. */
async function typography(page: Page) {
  return page.evaluate(async (heading) => {
    await document.fonts.ready;
    const faces = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, ""));
    const h = [...document.querySelectorAll("h1, h2")].find((el) => (el.textContent ?? "").includes(heading)) as HTMLElement | undefined;
    const headingFamily = h ? getComputedStyle(h).fontFamily : null;
    const bodyFamily = getComputedStyle(document.querySelector("p") ?? document.body).fontFamily;
    const first = (stack: string | null) => (stack ?? "").split(",")[0]!.trim().replace(/["']/g, "");
    return {
      loadedFaces: [...new Set(faces)],
      headingFamily,
      headingFaceLoaded: h ? faces.includes(first(headingFamily)) : false,
      bodyFamily,
    };
  }, headingFor(PREFIX, "alpha"));
}

test.describe.serial("Phase 3B — console-clean happy paths and theme typography", () => {
  test.beforeAll(async ({ browser }) => {
    assertQaOnly();
    mkdirSync(OUT, { recursive: true });
    owner = await createIdentity("fontowner");
    seed = await seedProjectAsOwner(owner, "Gate2 Fonts", PREFIX);
    const { error } = await owner.client.from("projects").update({ theme: THEME }).eq("id", seed.projectId);
    if (error) throw new Error(`seed theme failed: ${error.message}`);
    const ctx = await browser.newContext({ baseURL: APP_URL });
    const page = await ctx.newPage();
    await signIn(page, owner, seed.projectId);
    const res = await page.request.post(`/api/projects/${seed.projectId}/publish`, { headers: { Origin: APP_URL, "Content-Type": "application/json" }, data: {} });
    expect(res.status(), await res.text()).toBe(200);
    await ctx.close();
  });

  test.afterAll(async () => {
    const cleanup = await cleanupGate2();
    const db = svc();
    const residue: Record<string, number> = {};
    for (const table of ["projects", "project_pages", "deployments", "site_subscriptions", "website_versions", "site_analytics_events"]) {
      const col = table === "projects" ? "id" : "project_id";
      const { count, error } = await db.from(table).select("*", { count: "exact", head: true }).in(col, cleanup.projects);
      residue[table] = error ? -1 : count ?? -1;
    }
    const remainingUsers: string[] = [];
    for (const id of cleanup.users) if ((await db.auth.admin.getUserById(id)).data?.user) remainingUsers.push(id);
    evidence.cleanup = { ...cleanup, residue, remainingUsers };
    writeFileSync(join(OUT, "console-fonts-evidence.json"), JSON.stringify(evidence, null, 2));
    if (cleanup.errors.length || remainingUsers.length || Object.values(residue).some((n) => n !== 0)) {
      throw new Error(`cleanup incomplete: ${JSON.stringify(evidence.cleanup)}`);
    }
  });

  test("Builder happy path (sign in, open, switch Desktop → Tablet → Phone → Desktop) has zero console errors", async ({ browser }: { browser: Browser }) => {
    const ctx = await browser.newContext({ baseURL: APP_URL });
    const page = await ctx.newPage();
    const problems = watchConsole(page);
    try {
      await signIn(page, owner, seed.projectId);
      await expect(page.locator('section[aria-label="Template"]').getByRole("button", { name: "Hero banner", exact: true })).toBeVisible({ timeout: 90_000 });
      for (const device of ["Tablet", "Phone", "Desktop"]) {
        const btn = page.getByRole("group", { name: "Preview device" }).getByRole("button", { name: device, exact: true });
        await btn.click();
        await expect(btn).toHaveAttribute("aria-pressed", "true");
        await page.waitForLoadState("networkidle");
      }
      await page.screenshot({ path: join(OUT, "fonts-builder-desktop.png") });
      evidence.builder = { problems };
      expect(problems).toEqual([]);
    } finally {
      await ctx.close();
    }
  });

  for (const [device, width] of [["desktop", 1440], ["tablet", 768], ["mobile", 390]] as const) {
    test(`published page at ${width}px: zero console errors and the theme fonts load`, async ({ browser }) => {
      const ctx = await browser.newContext({ baseURL: APP_URL, viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      const problems = watchConsole(page);
      try {
        const res = await page.goto(`/sites/${seed.subdomain}`, { waitUntil: "networkidle", timeout: 90_000 });
        expect(res?.status()).toBe(200);
        const type = await typography(page);
        await page.screenshot({ path: join(OUT, `fonts-published-${device}-${width}.png`), fullPage: true });
        evidence[`published-${device}`] = { problems, ...type };
        expect(problems, "console errors").toEqual([]);
        expect(type.loadedFaces.some((f) => /fraunces/i.test(f)), `Fraunces loaded (faces: ${type.loadedFaces.join(", ")})`).toBe(true);
        expect(type.loadedFaces.some((f) => /inter/i.test(f)), `Inter loaded (faces: ${type.loadedFaces.join(", ")})`).toBe(true);
        expect(type.headingFaceLoaded, `heading renders in a loaded theme face (${type.headingFamily})`).toBe(true);
      } finally {
        await ctx.close();
      }
    });
  }
});
