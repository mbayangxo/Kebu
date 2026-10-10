/**
 * B1 — Undo/Redo persistence in a real browser (QA only).
 *
 * Undo/Redo persist full snapshots through POST /sections/batch, which now passes the same save
 * boundary as PATCH /sections. Each step is verified in the database AND by loading the Builder
 * fresh in a second tab (what a reload shows) — the first tab keeps its in-memory history so Redo
 * can follow. Finally the result is published and checked live at 1440 and 390.
 *
 * Steps on the seeded Hero: A heading → B height 100vh → C Phone-only heading (device override);
 * Undo C, Undo B, Redo B, Redo C. Each Undo/Redo writes only the section it changes.
 * Then a history step the server rejects (the restored state has an empty heading): the error is
 * shown, nothing is written, publishing is blocked, and fixing the heading + Save draft recovers.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type BrowserContext, type Page } from "playwright/test";
import {
  APP_URL,
  assertQaOnly,
  cleanupGate2,
  createIdentity,
  readPersisted,
  seedProjectAsOwner,
  svc,
  type Identity,
  type SeededProject,
} from "./fixtures";

const OUT = process.env.GATE2_OUTPUT_DIR ?? "./.gate2-results";
const PREFIX = "G2U-";
const A = "UR-A heading";
const C = "UR-C phone heading";
const D = "UR-D fixed heading";
const batchBodies: { updates: { id: string; props: Record<string, unknown> }[] }[] = [];
const evidence: Record<string, unknown> = {};
const consoleProblems: string[] = [];
let owner: Identity;
let seed: SeededProject;
let ctx: BrowserContext;
let page: Page;

async function signIn(p: Page) {
  await p.goto(`/login?next=${encodeURIComponent(`/create/${seed.projectId}`)}`, { waitUntil: "networkidle" });
  await p.locator('input[type="email"]').fill(owner.email);
  await p.locator('input[type="password"]').fill(owner.password);
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
  await p.waitForURL(`**/create/${seed.projectId}**`, { timeout: 90_000 });
}

const heroRow = (p: Page) => p.locator('section[aria-label="Template"]').getByRole("button", { name: "Hero banner", exact: true });

async function openBuilder(p: Page) {
  await expect(heroRow(p)).toBeVisible({ timeout: 90_000 });
  const closeDial = p.getByRole("button", { name: "Close menu", exact: true });
  if (await closeDial.isVisible()) await closeDial.click();
}

async function openHero(p: Page) {
  const back = p.getByRole("button", { name: "Back to sections list", exact: true });
  if (await back.isVisible()) await back.click();
  await heroRow(p).click();
  await expect(p.getByLabel("Hero heading", { exact: true })).toBeVisible();
}

async function selectDevice(p: Page, device: "Desktop" | "Phone") {
  const btn = p.getByRole("group", { name: "Preview device" }).getByRole("button", { name: device, exact: true });
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
}

const heroProps = async () => (await readPersisted(seed)).props[seed.sectionIds.alpha] ?? {};
const phoneHeading = (p: Record<string, unknown>) => (p.deviceOverrides as { mobile?: { heading?: string } } | undefined)?.mobile?.heading;

async function waitStored(check: (p: Record<string, unknown>) => boolean, message: string) {
  await expect.poll(async () => check(await heroProps()), { timeout: 30_000, message }).toBe(true);
}

async function historyStep(label: "Undo" | "Redo") {
  const res = page.waitForResponse((r) => r.url().endsWith(`/api/projects/${seed.projectId}/sections/batch`) && r.request().method() === "POST");
  await page.getByRole("button", { name: label, exact: true }).click();
  const r = await res;
  expect(r.status(), `${label} batch: ${await r.text()}`).toBe(200);
  const body = JSON.parse(r.request().postData() ?? "{}") as (typeof batchBodies)[number];
  expect(body.updates.map((u) => u.id), `${label} writes only the changed Hero`).toEqual([seed.sectionIds.alpha]);
}

/** What a reload shows: a fresh Builder tab's Desktop heading + height and Phone heading. */
async function freshBuilderView() {
  const p = await ctx.newPage();
  try {
    await p.goto(`/create/${seed.projectId}`, { waitUntil: "networkidle" });
    await openBuilder(p);
    await openHero(p);
    const desktop = { heading: await p.getByLabel("Hero heading", { exact: true }).inputValue(), height: await p.getByLabel("Hero height", { exact: true }).inputValue() };
    await selectDevice(p, "Phone");
    await openHero(p);
    const phone = await p.getByLabel("Hero heading", { exact: true }).inputValue();
    return { ...desktop, phoneHeading: phone };
  } finally {
    await p.close();
  }
}

test.describe.serial("B1 — Undo/Redo persist through the canonical save boundary", () => {
  test.beforeAll(async ({ browser }) => {
    assertQaOnly();
    mkdirSync(OUT, { recursive: true });
    owner = await createIdentity("undoredo");
    seed = await seedProjectAsOwner(owner, "Gate2 UndoRedo", PREFIX);
    ctx = await browser.newContext({ baseURL: APP_URL, viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") consoleProblems.push(`console.error: ${m.text().slice(0, 300)}`); });
    page.on("pageerror", (e) => consoleProblems.push(`pageerror: ${e.message.slice(0, 300)}`));
    page.on("request", (r) => {
      if (r.url().endsWith(`/api/projects/${seed.projectId}/sections/batch`) && r.method() === "POST") batchBodies.push(JSON.parse(r.postData() ?? "{}"));
    });
    await signIn(page);
    await openBuilder(page);
  });

  test.afterAll(async () => {
    await ctx?.close();
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
    evidence.consoleProblems = consoleProblems;
    writeFileSync(join(OUT, "undo-redo-evidence.json"), JSON.stringify(evidence, null, 2));
    if (cleanup.errors.length || remainingUsers.length || Object.values(residue).some((n) => n !== 0)) {
      throw new Error(`cleanup incomplete: ${JSON.stringify(evidence.cleanup)}`);
    }
  });

  test("edits A (heading), B (height 100vh), C (Phone-only heading) are saved", async () => {
    await openHero(page);
    await page.getByLabel("Hero heading", { exact: true }).fill(A);
    await waitStored((p) => p.heading === A, "A saved");
    await page.getByLabel("Hero height", { exact: true }).selectOption("100vh");
    await waitStored((p) => p.minHeight === "100vh", "B saved");
    await selectDevice(page, "Phone");
    await openHero(page);
    await page.getByLabel("Hero heading", { exact: true }).fill(C);
    await waitStored((p) => phoneHeading(p) === C && p.heading === A, "C saved as a Phone override");
    await selectDevice(page, "Desktop");
    evidence.afterEdits = await heroProps();
  });

  test("Undo C → the Phone override is removed; a fresh load agrees", async () => {
    await historyStep("Undo");
    await waitStored((p) => phoneHeading(p) === undefined && p.minHeight === "100vh" && p.heading === A, "Undo C persisted");
    const view = await freshBuilderView();
    evidence.undoC = { stored: await heroProps(), view };
    expect(view).toEqual({ heading: A, height: "100vh", phoneHeading: A });
  });

  test("Undo B → the Hero is back to its legacy height; a fresh load agrees", async () => {
    await historyStep("Undo");
    await waitStored((p) => p.minHeight === undefined && p.heading === A, "Undo B persisted");
    const view = await freshBuilderView();
    evidence.undoB = { stored: await heroProps(), view };
    expect(view).toEqual({ heading: A, height: "80vh", phoneHeading: A });
  });

  test("Redo B, Redo C → height and Phone override return; a fresh load agrees", async () => {
    await historyStep("Redo");
    await waitStored((p) => p.minHeight === "100vh", "Redo B persisted");
    evidence.redoB = { view: await freshBuilderView() };
    expect(evidence.redoB).toEqual({ view: { heading: A, height: "100vh", phoneHeading: A } });
    await historyStep("Redo");
    await waitStored((p) => phoneHeading(p) === C && p.minHeight === "100vh" && p.heading === A, "Redo C persisted");
    const view = await freshBuilderView();
    evidence.redoC = { stored: await heroProps(), view };
    expect(view).toEqual({ heading: A, height: "100vh", phoneHeading: C });
  });

  test("publish after Undo/Redo → the live site shows the restored state", async ({ browser }) => {
    const res = page.waitForResponse((r) => r.url().endsWith(`/api/projects/${seed.projectId}/publish`) && r.request().method() === "POST", { timeout: 90_000 });
    await page.getByRole("button", { name: /^(Publish|Republish)$/ }).click();
    expect((await res).status()).toBe(200);
    const live: Record<string, unknown> = {};
    for (const [name, width, height, expected] of [["desktop", 1440, 900, A], ["phone", 390, 844, C]] as const) {
      const c = await browser.newContext({ baseURL: APP_URL, viewport: { width, height } });
      const p = await c.newPage();
      await p.goto(`/sites/${seed.subdomain}`, { waitUntil: "networkidle" });
      const hero = p.locator("section[data-hero-height]").first();
      await expect(hero.getByRole("heading", { level: 1 })).toHaveText(expected);
      live[name] = { heading: await hero.getByRole("heading", { level: 1 }).innerText(), heightAttr: await hero.getAttribute("data-hero-height") };
      expect(await hero.getAttribute("data-hero-height")).toBe("100vh");
      await p.screenshot({ path: join(OUT, `undo-redo-live-${name}-${width}.png`) });
      await c.close();
    }
    evidence.live = live;
    expect(consoleProblems).toEqual([]);
  });

  test("an Undo the server rejects is shown, writes nothing and blocks publishing; fixing + Save draft recovers", async () => {
    await openHero(page);
    const heading = page.getByLabel("Hero heading", { exact: true });
    const before = await heroProps();
    // An empty heading is invalid (the PATCH is rejected and the Builder says so) …
    await heading.fill("");
    await expect(page.getByText(/Save failed|Invalid props/).first()).toBeVisible();
    // … a later edit records that local state in the history …
    await page.getByLabel("Hero height", { exact: true }).selectOption("70vh");
    await page.waitForTimeout(1_500);
    // … and Undo restores it: the snapshot is invalid, so the batch is rejected as a whole.
    const rejected = page.waitForResponse((r) => r.url().endsWith(`/api/projects/${seed.projectId}/sections/batch`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    const r = await rejected;
    expect(r.status()).toBe(400);
    const rejectedBody = await r.json();
    await expect(page.getByText("Your saved draft was not changed.", { exact: false }).first()).toBeVisible();
    expect(await heroProps(), "nothing was written").toEqual(before);

    const publishRequests: string[] = [];
    const onReq = (q: import("playwright/test").Request) => { if (q.url().endsWith(`/api/projects/${seed.projectId}/publish`)) publishRequests.push(q.method()); };
    page.on("request", onReq);
    await page.getByRole("button", { name: /^(Publish|Republish)$/ }).click();
    await expect(page.getByText(/before publishing/).first()).toBeVisible();
    await page.waitForTimeout(1_500);
    page.off("request", onReq);
    expect(publishRequests, "publishing is blocked while the rejected Undo is pending").toEqual([]);

    await heading.fill(D);
    const retry = page.waitForResponse((q) => q.url().endsWith(`/api/projects/${seed.projectId}/sections/batch`) && q.request().method() === "POST");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    expect((await retry).status(), "Save draft retries the pending Undo with the current props").toBe(200);
    await waitStored((p) => p.heading === D, "the fixed heading is stored");
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    const view = await freshBuilderView();
    evidence.rejectedUndo = { status: r.status(), response: rejectedBody, storedBefore: before, storedAfter: await heroProps(), view, publishRequestsWhileBlocked: publishRequests.length };
    expect(view.heading).toBe(D);
    evidence.batchBodies = batchBodies.map((b) => b.updates.map((u) => u.id));
    expect(consoleProblems.filter((c) => !/status of 400/.test(c)), "only the expected 400 responses are logged").toEqual([]);
  });
});
