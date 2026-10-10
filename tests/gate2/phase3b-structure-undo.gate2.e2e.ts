/**
 * O5 — Undo/Redo of Add and Remove persist (QA only).
 *
 * Before: Add and Remove wrote the server immediately, but an Undo/Redo snapshot only updated props
 * of rows that still existed — Undo of Add left the section on the server, Undo of Remove "restored"
 * a row that no longer existed (silently skipped, reported as "Draft saved"). A reload brought the
 * server's structure back.
 *
 * Every step is checked in the database, in a fresh Builder tab (= reload) and, where stated, on the
 * published site after Publish (the live page must list exactly the stored sections, in order).
 * Requests are held or failed by route interception to force the out-of-order and failure cases.
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
  readPersisted,
  seedProjectAsOwner,
  svc,
  type Identity,
  type SeededProject,
} from "./fixtures";

const OUT = process.env.GATE2_OUTPUT_DIR ?? "./.gate2-results";
const PREFIX = "G2O-";
const HOLD_MS = 2_500;
const evidence: Record<string, unknown> = {};
const consoleProblems: string[] = [];
let owner: Identity;
let seed: SeededProject;
let ctx: BrowserContext;
let page: Page;
let holdNextPatch = false;
let failNextBatch = false;
const batchBodies: { updates: { id: string; restore?: unknown }[]; deletes?: string[] }[] = [];

const template = (p: Page) => p.locator('section[aria-label="Template"]');
const row = (p: Page, label: string) => template(p).getByRole("button", { name: label, exact: true });
const MARKERS = () => ({
  [seed.sectionIds.alpha]: headingFor(PREFIX, "alpha"),
  [seed.sectionIds.bravo]: headingFor(PREFIX, "bravo"),
  [seed.sectionIds.charlie]: headingFor(PREFIX, "charlie"),
  [seed.sectionIds.delta]: headingFor(PREFIX, "delta"),
});

async function openBuilder(p: Page) {
  await expect(row(p, "Hero banner").first()).toBeVisible({ timeout: 90_000 });
  const closeDial = p.getByRole("button", { name: "Close menu", exact: true });
  if (await closeDial.isVisible()) await closeDial.click();
}

async function backToList(p: Page) {
  const back = p.getByRole("button", { name: "Back to sections list", exact: true });
  if (await back.isVisible()) await back.click();
}

const storedIds = async () => (await readPersisted(seed)).desktopOrder;

async function waitIds(check: (ids: string[]) => boolean, message: string) {
  await expect.poll(async () => check(await storedIds()), { timeout: 30_000, message }).toBe(true);
}

async function historyStep(label: "Undo" | "Redo", expectStatus = 200) {
  const res = page.waitForResponse((r) => r.url().endsWith(`/api/projects/${seed.projectId}/sections/batch`) && r.request().method() === "POST");
  await page.getByRole("button", { name: label, exact: true }).click();
  const r = await res;
  expect(r.status(), `${label} batch`).toBe(expectStatus);
  const body = JSON.parse(r.request().postData() ?? "{}") as { updates: { id: string }[]; deletes?: string[] };
  return { updates: body.updates.map((u) => u.id), deletes: body.deletes ?? [] };
}

async function removeSection(label: string) {
  await backToList(page);
  await row(page, label).first().click();
  await page.getByRole("button", { name: "Remove", exact: true }).first().click();
  const del = page.waitForResponse((r) => r.url().endsWith(`/api/projects/${seed.projectId}/sections`) && r.request().method() === "DELETE");
  await page.getByRole("group", { name: "Confirm remove section" }).getByRole("button", { name: "Remove", exact: true }).click();
  expect((await del).status()).toBe(200);
}

/** What a reload shows: the section rows of a fresh Builder tab, in order. */
async function freshRows(): Promise<string[]> {
  const p = await ctx.newPage();
  try {
    await p.goto(`/create/${seed.projectId}`, { waitUntil: "networkidle" });
    await openBuilder(p);
    return (await template(p).getByRole("button").allInnerTexts()).map((t) => t.trim()).filter((t) => ["Hero banner", "Text", "FAQ", "Features"].includes(t));
  } finally {
    await p.close();
  }
}

/** Publish and return the markers of the stored sections as the live page shows them, in order. */
async function publishAndReadLive(tag: string) {
  const res = page.waitForResponse((r) => r.url().endsWith(`/api/projects/${seed.projectId}/publish`) && r.request().method() === "POST", { timeout: 90_000 });
  await page.getByRole("button", { name: /^(Publish|Republish)$/ }).click();
  expect((await res).status(), `publish (${tag})`).toBe(200);
  const html = await (await page.request.get(`/sites/${seed.subdomain}`)).text();
  // Each seeded section's heading as stored now (a test may have edited one), plus the original
  // headings of sections that are not stored — so a removed section still showing live is caught.
  const stored = await readPersisted(seed);
  const markers: Record<string, string> = { ...MARKERS() };
  for (const id of Object.keys(markers)) if (typeof stored.props[id]?.heading === "string") markers[id] = stored.props[id]!.heading as string;
  const live = Object.values(markers)
    .map((m) => ({ m, at: html.indexOf(`>${m}<`) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.m);
  const expected = stored.desktopOrder.map((id) => markers[id]).filter(Boolean);
  const heroSections = (html.match(/data-hero-height=/g) ?? []).length;
  return { live, expected, heroSections };
}

test.describe.serial("O5 — Undo/Redo of Add and Remove persist", () => {
  test.beforeAll(async ({ browser }) => {
    assertQaOnly();
    mkdirSync(OUT, { recursive: true });
    owner = await createIdentity("structundo");
    seed = await seedProjectAsOwner(owner, "Gate2 StructUndo", PREFIX);
    ctx = await browser.newContext({ baseURL: APP_URL, viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") consoleProblems.push(`console.error: ${m.text().slice(0, 300)}`); });
    page.on("pageerror", (e) => consoleProblems.push(`pageerror: ${e.message.slice(0, 300)}`));
    await page.route(`**/api/projects/${seed.projectId}/sections`, async (route) => {
      if (route.request().method() === "PATCH" && holdNextPatch) {
        holdNextPatch = false;
        await new Promise((r) => setTimeout(r, HOLD_MS));
      }
      await route.continue();
    });
    await page.route(`**/api/projects/${seed.projectId}/sections/batch`, async (route) => {
      batchBodies.push(JSON.parse(route.request().postData() ?? "{}"));
      if (failNextBatch) {
        failNextBatch = false;
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Simulated server failure (QA)." }) });
        return;
      }
      await route.continue();
    });
    await page.goto(`/login?next=${encodeURIComponent(`/create/${seed.projectId}`)}`, { waitUntil: "networkidle" });
    await page.locator('input[type="email"]').fill(owner.email);
    await page.locator('input[type="password"]').fill(owner.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(`**/create/${seed.projectId}**`, { timeout: 90_000 });
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
    evidence.batchBodies = batchBodies.map((b) => ({ updates: b.updates?.map((u) => ({ id: u.id, restore: Boolean(u.restore) })), deletes: b.deletes }));
    writeFileSync(join(OUT, "structure-undo-evidence.json"), JSON.stringify(evidence, null, 2));
    if (cleanup.errors.length || remainingUsers.length || Object.values(residue).some((n) => n !== 0)) {
      throw new Error(`cleanup incomplete: ${JSON.stringify(evidence.cleanup)}`);
    }
  });

  test("Add → Undo → reload → Redo → reload; publishing each state publishes exactly that state", async () => {
    const original = await storedIds();
    await backToList(page);
    await page.getByRole("button", { name: /^\+\s*Add section$/ }).first().click();
    await page.getByRole("dialog", { name: "Add a section" }).locator("button", { has: page.getByText("Hero banner", { exact: true }) }).click();
    let added = "";
    await waitIds((ids) => { added = ids.find((id) => !original.includes(id)) ?? ""; return ids.length === 5; }, "added section stored");
    const addedRow = (await readPersisted(seed)).props[added]!;
    const afterAdd = await publishAndReadLive("after add");
    expect(afterAdd.heroSections, "live: the added Hero is published").toBe(2);

    expect(await historyStep("Undo"), "Undo of Add (right after Publish) writes only the delete").toEqual({ updates: [], deletes: [added] });
    await waitIds((ids) => ids.length === 4 && !ids.includes(added), "Undo of Add deleted the section");
    expect(await storedIds()).toEqual(original);
    expect(await freshRows(), "reload after Undo: the added section is gone").toEqual(["Hero banner", "Text", "FAQ", "Features"]);
    const afterUndo = await publishAndReadLive("after undo add");
    expect(afterUndo.heroSections).toBe(1);
    expect(afterUndo.live).toEqual(afterUndo.expected);

    expect(await historyStep("Redo"), "Redo of Add writes only the re-created section").toEqual({ updates: [added], deletes: [] });
    await waitIds((ids) => ids.includes(added) && ids.length === 5, "Redo of Add re-created the section");
    expect((await readPersisted(seed)).props[added], "re-created with the same id and props").toEqual(addedRow);
    expect((await freshRows()).filter((r) => r === "Hero banner"), "reload after Redo: the section is back").toHaveLength(2);
    const afterRedo = await publishAndReadLive("after redo add");
    expect(afterRedo.heroSections).toBe(2);
    expect(afterRedo.live).toEqual(afterRedo.expected);
    evidence.add = { added, afterAdd, afterUndo, afterRedo };

    await historyStep("Undo"); // back to the four seeded sections for the next test
    await waitIds((ids) => ids.length === 4, "back to four sections");
  });

  test("Remove → Undo → reload → Redo → reload; publishing each state publishes exactly that state", async () => {
    const bravo = seed.sectionIds.bravo;
    const before = await readPersisted(seed);
    await removeSection("Text");
    await waitIds((ids) => !ids.includes(bravo), "Remove deleted the section");
    const afterRemove = await publishAndReadLive("after remove");
    expect(afterRemove.live).not.toContain(headingFor(PREFIX, "bravo"));

    expect(await historyStep("Undo"), "Undo of Remove writes only the re-created section").toEqual({ updates: [bravo], deletes: [] });
    await waitIds((ids) => ids.includes(bravo), "Undo of Remove re-created the section");
    const restored = await readPersisted(seed);
    expect(restored.desktopOrder, "same position").toEqual(before.desktopOrder);
    expect(restored.props[bravo], "same id and props").toEqual(before.props[bravo]);
    expect(await freshRows(), "reload after Undo: the section is back in place").toEqual(["Hero banner", "Text", "FAQ", "Features"]);
    const afterUndo = await publishAndReadLive("after undo remove");
    expect(afterUndo.live).toEqual(afterUndo.expected);
    expect(afterUndo.live).toContain(headingFor(PREFIX, "bravo"));

    expect(await historyStep("Redo"), "Redo of Remove writes only the delete").toEqual({ updates: [], deletes: [bravo] });
    await waitIds((ids) => !ids.includes(bravo), "Redo of Remove deleted it again");
    expect(await freshRows(), "reload after Redo: removed again").toEqual(["Hero banner", "FAQ", "Features"]);
    const afterRedo = await publishAndReadLive("after redo remove");
    expect(afterRedo.live).toEqual(afterRedo.expected);
    expect(afterRedo.live).not.toContain(headingFor(PREFIX, "bravo"));
    evidence.remove = { afterRemove, afterUndo, afterRedo };

    await historyStep("Undo");
    await waitIds((ids) => ids.includes(bravo), "restored for the next test");
  });

  test("rapid: edit → Remove while the edit's autosave is in flight → Undo — the edit survives and nothing stale lands later", async () => {
    const bravo = seed.sectionIds.bravo;
    const EDITED = `${PREFIX}BRAVO edited before remove`;
    await backToList(page);
    await row(page, "Text").first().click();
    // The Text inspector's fields have no accessible label (recorded); find the heading by its value.
    const boxes = page.getByRole("textbox");
    const values = await boxes.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    const heading = boxes.nth(values.indexOf(headingFor(PREFIX, "bravo")));
    holdNextPatch = true;
    await heading.fill(EDITED);
    await page.waitForTimeout(900); // the autosave is sent — and held
    await removeSection("Text");
    await historyStep("Undo");
    await waitIds((ids) => ids.includes(bravo), "restored");
    await page.waitForTimeout(HOLD_MS + 2_000); // every held request has landed
    const stored = await readPersisted(seed);
    evidence.rapidEditRemoveUndo = { heading: stored.props[bravo]?.heading, order: stored.desktopOrder };
    expect(stored.props[bravo]?.heading, "the restored section carries the edit").toBe(EDITED);
    expect(stored.desktopOrder).toHaveLength(4);
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
  });

  test("rapid Add → Undo → Redo → Undo: the stored structure matches the Builder once everything lands", async () => {
    const original = await storedIds();
    await backToList(page);
    await page.getByRole("button", { name: /^\+\s*Add section$/ }).first().click();
    await page.getByRole("dialog", { name: "Add a section" }).locator("button", { has: page.getByText("Hero banner", { exact: true }) }).click();
    await waitIds((ids) => ids.length === 5, "added");
    const before = batchBodies.length;
    for (const label of ["Undo", "Redo", "Undo"] as const) await page.getByRole("button", { name: label, exact: true }).click();
    await expect.poll(async () => (await storedIds()).join(","), { timeout: 30_000 }).toBe(original.join(","));
    await page.waitForTimeout(3_000);
    expect(await storedIds(), "still the Builder's state after every request landed").toEqual(original);
    expect(await freshRows()).toEqual(["Hero banner", "Text", "FAQ", "Features"]);
    evidence.rapidAddUndo = { batches: batchBodies.length - before };
    expect(batchBodies.length - before, "at most one batch per click").toBeLessThanOrEqual(3);
  });

  test("a failed Undo is surfaced (not reported as saved) and Save draft completes it", async () => {
    const charlie = seed.sectionIds.charlie;
    await removeSection("FAQ");
    await waitIds((ids) => !ids.includes(charlie), "removed");
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    failNextBatch = true;
    await historyStep("Undo", 500);
    await expect(page.getByText(/not saved yet|queued/i).first(), "the failure is visible").toBeVisible();
    await expect(page.getByText("Draft saved", { exact: true })).toHaveCount(0);
    expect(await storedIds(), "nothing was restored on the server").not.toContain(charlie);

    const retry = page.waitForResponse((r) => r.url().endsWith(`/api/projects/${seed.projectId}/sections/batch`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    expect((await retry).status()).toBe(200);
    await waitIds((ids) => ids.includes(charlie), "Save draft completed the Undo");
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    expect(await freshRows()).toEqual(["Hero banner", "Text", "FAQ", "Features"]);
    const live = await publishAndReadLive("after recovered undo");
    expect(live.live).toEqual(live.expected);
    evidence.failedUndo = { recovered: true, live };
    expect(consoleProblems.filter((c) => !/status of 500/.test(c)), "only the simulated 500 is logged").toEqual([]);
  });
});
