/**
 * R1 — the app tree must mount once. Run against a PRODUCTION build (`next build && next start`):
 * React Strict Mode double-invokes mount effects in development, so effect/network counts are
 * only meaningful in production.
 *
 * Defect: LocaleProvider (root layout) rendered `<>{children}</>` until its mount effect ran, then
 * `<LocaleContext.Provider>{children}</…>`. The element type change made React unmount and rebuild
 * the whole page tree once after hydration, on every page: DOM nodes replaced, focus and typed
 * input lost, every mount effect run twice (e.g. two pageview beacons per visit).
 *
 * Covers: no app-root removal after first render (public page, Builder, published site); input
 * value + focus preserved; locale from saved preference and from the browser; explicit locale
 * change + persistence; sign-in state across reload; Builder edit kept; the Builder's load requests
 * sent once per load; one pageview per load.
 * QA only (tests/gate2/fixtures.ts guards); synthetic data removed and verified in afterAll.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type BrowserContext, type Page } from "playwright/test";
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
const PREFIX = "G2R-";
const SETTLE_MS = 3_000;
const evidence: Record<string, unknown> = {};
let owner: Identity;
let seed: SeededProject;

/**
 * Records every element removed from <body> (the app root lives there) after the document starts
 * parsing, excluding React's streaming holders (<div hidden id="S:…">, <template>) and scripts.
 */
async function trackRootRemovals(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    const w = window as unknown as { __rootRemovals: string[] };
    w.__rootRemovals = [];
    const ignored = (el: Element) =>
      ["SCRIPT", "STYLE", "LINK", "TEMPLATE", "NEXT-ROUTE-ANNOUNCER"].includes(el.tagName) ||
      (el instanceof HTMLElement && el.hidden && /^S:/.test(el.id));
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.target !== document.body) continue;
        for (const n of m.removedNodes) {
          if (n instanceof Element && !ignored(n)) {
            w.__rootRemovals.push(`${n.tagName.toLowerCase()}${n.id ? "#" + n.id : ""}.${String(n.getAttribute("class") ?? "").split(/\s+/).slice(0, 2).join(".")}`);
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
}

const rootRemovals = (p: Page) => p.evaluate(() => (window as unknown as { __rootRemovals: string[] }).__rootRemovals);

async function signIn(p: Page, next: string) {
  await p.goto(`/login?next=${encodeURIComponent(next)}`, { waitUntil: "networkidle" });
  await p.locator('input[type="email"]').fill(owner.email);
  await p.locator('input[type="password"]').fill(owner.password);
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
  await p.waitForURL(`**${next}**`, { timeout: 90_000 });
}

test.describe.serial("R1 — the app tree mounts once (production build)", () => {
  test.beforeAll(async () => {
    assertQaOnly();
    mkdirSync(OUT, { recursive: true });
    owner = await createIdentity("remount");
    seed = await seedProjectAsOwner(owner, "Gate2 Remount", PREFIX);
  });

  test.afterAll(async () => {
    const cleanup = await cleanupGate2();
    const db = svc();
    const residue: Record<string, number> = {};
    for (const table of ["projects", "project_pages", "deployments", "website_versions", "site_analytics_events"]) {
      const col = table === "projects" ? "id" : "project_id";
      const { count, error } = await db.from(table).select("*", { count: "exact", head: true }).in(col, cleanup.projects);
      residue[table] = error ? -1 : count ?? -1;
    }
    const remainingUsers: string[] = [];
    for (const id of cleanup.users) if ((await db.auth.admin.getUserById(id)).data?.user) remainingUsers.push(id);
    evidence.cleanup = { ...cleanup, residue, remainingUsers };
    writeFileSync(join(OUT, "remount-evidence.json"), JSON.stringify(evidence, null, 2));
    if (cleanup.errors.length || remainingUsers.length || Object.values(residue).some((n) => n !== 0)) {
      throw new Error(`cleanup incomplete: ${JSON.stringify(evidence.cleanup)}`);
    }
  });

  test("public page: nothing under <body> is removed after load; typed input and focus are kept", async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: APP_URL });
    await trackRootRemovals(ctx);
    const p = await ctx.newPage();
    try {
      await p.goto("/login", { waitUntil: "domcontentloaded" });
      const email = p.locator('input[type="email"]');
      // Wait for hydration: a controlled input only keeps typed text once React owns it.
      await expect(async () => {
        await email.fill("focus@test.kebu.invalid");
        await expect(email).toHaveValue("focus@test.kebu.invalid", { timeout: 500 });
      }).toPass({ timeout: 30_000 });
      await email.focus();
      await p.evaluate(() => { (window as unknown as { __email: Element | null }).__email = document.activeElement; });
      await p.waitForTimeout(SETTLE_MS);
      const state = await p.evaluate(() => {
        const el = (window as unknown as { __email: HTMLInputElement | null }).__email;
        return { connected: el?.isConnected ?? false, focused: document.activeElement === el, value: el?.value ?? null };
      });
      const removals = await rootRemovals(p);
      evidence.publicPage = { removals, ...state };
      expect(removals, "no app-root element removed after load").toEqual([]);
      expect(state, "the same input keeps its value and focus").toEqual({ connected: true, focused: true, value: "focus@test.kebu.invalid" });
    } finally {
      await ctx.close();
    }
  });

  test("locale: saved preference, browser language, explicit change and persistence", async ({ browser }) => {
    const langButton = (p: Page) => p.locator('button[aria-haspopup="listbox"]').first();
    const results: Record<string, unknown> = {};

    // 1) No saved preference → browser language decides.
    for (const [locale, expected] of [["fr-FR", "Français"], ["en-US", "English"]] as const) {
      const ctx = await browser.newContext({ baseURL: APP_URL, locale });
      await trackRootRemovals(ctx);
      const p = await ctx.newPage();
      await p.goto("/login", { waitUntil: "networkidle" });
      await expect(langButton(p)).toContainText(expected);
      results[`browser-${locale}`] = { button: (await langButton(p).innerText()).trim(), removals: await rootRemovals(p) };
      expect(await rootRemovals(p)).toEqual([]);
      await ctx.close();
    }

    // 2) Saved preference wins over the browser; an explicit change is applied and persisted.
    const ctx = await browser.newContext({ baseURL: APP_URL, locale: "en-US" });
    await trackRootRemovals(ctx);
    const p = await ctx.newPage();
    try {
      await p.goto("/login", { waitUntil: "domcontentloaded" });
      await p.evaluate(() => localStorage.setItem("alkebulan_lang", "fr"));
      await p.reload({ waitUntil: "networkidle" });
      await expect(langButton(p)).toContainText("Français");

      await langButton(p).click();
      await p.getByRole("listbox").getByRole("button", { name: /Kiswahili/ }).click();
      await expect(langButton(p)).toContainText("Kiswahili");
      const stored = await p.evaluate(() => ({ lang: localStorage.getItem("alkebulan_lang"), manual: localStorage.getItem("alkebulan_lang_manual") }));
      expect(stored).toEqual({ lang: "sw", manual: "1" });

      await p.reload({ waitUntil: "networkidle" });
      await expect(langButton(p)).toContainText("Kiswahili");
      results.savedAndChanged = { stored, afterReload: (await langButton(p).innerText()).trim(), removals: await rootRemovals(p) };
      expect(await rootRemovals(p)).toEqual([]);
    } finally {
      await ctx.close();
    }
    evidence.locale = results;
  });

  test("auth + Builder: signed-in state survives reload; the Builder mounts once and keeps an edit", async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: APP_URL, viewport: { width: 1440, height: 900 } });
    await trackRootRemovals(ctx);
    const p = await ctx.newPage();
    try {
      await signIn(p, `/create/${seed.projectId}`);
      const heroRow = p.locator('section[aria-label="Template"]').getByRole("button", { name: "Hero banner", exact: true });
      await expect(heroRow).toBeVisible({ timeout: 90_000 });
      // A remount re-runs every mount effect: count the Builder's load requests across one reload.
      const loadRequests: string[] = [];
      const projectPath = `/api/projects/${seed.projectId}`;
      p.on("request", (r) => {
        const path = new URL(r.url()).pathname;
        if (r.method() === "GET" && (path === projectPath || path === `${projectPath}/billing`)) loadRequests.push(path);
      });
      await p.reload({ waitUntil: "networkidle" });
      expect(p.url(), "still signed in after reload (not sent to /login)").toContain(`/create/${seed.projectId}`);
      await expect(heroRow).toBeVisible({ timeout: 90_000 });
      await p.waitForTimeout(SETTLE_MS);
      const afterLoad = await rootRemovals(p);
      const loadCounts = { project: loadRequests.filter((x) => x === projectPath).length, billing: loadRequests.filter((x) => x.endsWith("/billing")).length };

      const closeDial = p.getByRole("button", { name: "Close menu", exact: true });
      if (await closeDial.isVisible()) await closeDial.click();
      await heroRow.click();
      const heading = p.getByLabel("Hero heading", { exact: true });
      await heading.fill(`${headingFor(PREFIX, "alpha")} KEPT`);
      await heading.focus();
      await p.waitForTimeout(SETTLE_MS);
      const kept = { value: await heading.inputValue(), focused: await heading.evaluate((el) => document.activeElement === el) };
      evidence.builder = { afterLoad, loadCounts, kept, removals: await rootRemovals(p) };
      expect(afterLoad, "Builder root not rebuilt after load").toEqual([]);
      expect(loadCounts, "each Builder load request is sent once per page load").toEqual({ project: 1, billing: 1 });
      expect(kept).toEqual({ value: `${headingFor(PREFIX, "alpha")} KEPT`, focused: true });

      const publish = await p.request.post(`/api/projects/${seed.projectId}/publish`, { headers: { Origin: APP_URL, "Content-Type": "application/json" }, data: {} });
      expect(publish.status(), await publish.text()).toBe(200);
    } finally {
      await ctx.close();
    }
  });

  test("published site: mounts once and records exactly one pageview per visit", async ({ browser }) => {
    // sendBeacon requests are not surfaced to Playwright, so count what the server stored.
    const storedPageviews = async () => {
      const { count, error } = await svc().from("site_analytics_events").select("*", { count: "exact", head: true }).eq("project_id", seed.projectId).eq("event_type", "pageview");
      if (error) throw new Error(error.message);
      return count ?? 0;
    };
    expect(await storedPageviews()).toBe(0);
    const visits: { removals: string[] }[] = [];
    for (let visit = 1; visit <= 2; visit++) {
      const ctx = await browser.newContext({ baseURL: APP_URL });
      await trackRootRemovals(ctx);
      const p = await ctx.newPage();
      try {
        const res = await p.goto(`/sites/${seed.subdomain}`, { waitUntil: "networkidle" });
        expect(res?.status()).toBe(200);
        await p.waitForTimeout(SETTLE_MS);
        visits.push({ removals: await rootRemovals(p) });
      } finally {
        await ctx.close();
      }
    }
    await expect.poll(storedPageviews, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
    await new Promise((r) => setTimeout(r, SETTLE_MS));
    const stored = await storedPageviews();
    evidence.publishedSite = { visits, storedPageviews: stored };
    for (const v of visits) expect(v.removals, "published site root not rebuilt").toEqual([]);
    expect(stored, "2 visits → exactly 2 stored pageviews").toBe(2);
  });
});
