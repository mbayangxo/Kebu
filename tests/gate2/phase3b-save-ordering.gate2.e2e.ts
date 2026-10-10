/**
 * Builder save ordering — a slow earlier save can never overwrite a newer edit (QA only).
 *
 * Found by the Hero E2E: an autosave sent first but finished last rewrote older props on the server
 * and in the Builder's local state; the newer edit vanished while the UI said "Draft saved".
 * Also covers Undo while an autosave is in flight (U1) and duplicate Undo/Redo writes (one click
 * sent two batch requests — side effects inside a React state updater).
 *
 * Also: two quick Undos while a save is in flight (one batch write, the newest state), and an edit
 * made while an Undo's batch write is in flight (sent after it; the edit wins).
 *
 * The first section PATCH (or batch POST) after arming is held for HOLD_MS by route interception,
 * forcing the out-of-order case deterministically.
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
const PREFIX = "G2S-";
const HOLD_MS = 2_500;
const evidence: Record<string, unknown> = {};
let owner: Identity;
let seed: SeededProject;
let ctx: BrowserContext;
let page: Page;
let holdNextPatch = false;
let holdNextBatch = false;
const batchRequests: string[] = [];
/** Section write events in the order the browser issued / finished them. */
const writeLog: string[] = [];

const heroRow = (p: Page) => p.locator('section[aria-label="Template"]').getByRole("button", { name: "Hero banner", exact: true });
const heroProps = async () => (await readPersisted(seed)).props[seed.sectionIds.alpha] ?? {};

async function openHero(p: Page) {
  const back = p.getByRole("button", { name: "Back to sections list", exact: true });
  if (await back.isVisible()) await back.click();
  await heroRow(p).click();
  await expect(p.getByLabel("Hero heading", { exact: true })).toBeVisible();
}

async function openBuilder(p: Page) {
  await expect(heroRow(p)).toBeVisible({ timeout: 90_000 });
  const closeDial = p.getByRole("button", { name: "Close menu", exact: true });
  if (await closeDial.isVisible()) await closeDial.click();
}

/** Stored props must reach `check` and still satisfy it after every held request has landed. */
async function expectStoredAndStable(check: (p: Record<string, unknown>) => boolean, message: string) {
  await expect.poll(async () => check(await heroProps()), { timeout: 30_000, message }).toBe(true);
  await page.waitForTimeout(HOLD_MS + 2_000);
  expect(check(await heroProps()), `${message} — still true after held saves landed`).toBe(true);
}

test.describe.serial("Builder save ordering", () => {
  test.beforeAll(async ({ browser }) => {
    assertQaOnly();
    mkdirSync(OUT, { recursive: true });
    owner = await createIdentity("saveorder");
    seed = await seedProjectAsOwner(owner, "Gate2 SaveOrder", PREFIX);
    ctx = await browser.newContext({ baseURL: APP_URL, viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
    await page.route(`**/api/projects/${seed.projectId}/sections`, async (route) => {
      if (route.request().method() === "PATCH" && holdNextPatch) {
        holdNextPatch = false;
        await new Promise((r) => setTimeout(r, HOLD_MS));
      }
      await route.continue();
    });
    await page.route(`**/api/projects/${seed.projectId}/sections/batch`, async (route) => {
      if (route.request().method() === "POST" && holdNextBatch) {
        holdNextBatch = false;
        await new Promise((r) => setTimeout(r, HOLD_MS));
      }
      await route.continue();
    });
    const kind = (r: import("playwright/test").Request) =>
      r.url().endsWith(`/api/projects/${seed.projectId}/sections/batch`) && r.method() === "POST"
        ? "batch"
        : r.url().endsWith(`/api/projects/${seed.projectId}/sections`) && r.method() === "PATCH"
          ? "patch"
          : null;
    page.on("request", (r) => {
      if (kind(r) === "batch") batchRequests.push(r.postData() ?? "");
      const k = kind(r);
      if (k) writeLog.push(`${k}:sent`);
    });
    page.on("requestfinished", (r) => {
      const k = kind(r);
      if (k) writeLog.push(`${k}:done`);
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
    const { count } = await db.from("projects").select("*", { count: "exact", head: true }).in("id", cleanup.projects);
    const remainingUsers: string[] = [];
    for (const id of cleanup.users) if ((await db.auth.admin.getUserById(id)).data?.user) remainingUsers.push(id);
    evidence.cleanup = { ...cleanup, remainingProjects: count, remainingUsers };
    writeFileSync(join(OUT, "save-ordering-evidence.json"), JSON.stringify(evidence, null, 2));
    if (cleanup.errors.length || remainingUsers.length || count !== 0) throw new Error(`cleanup incomplete: ${JSON.stringify(evidence.cleanup)}`);
  });

  test("a slow autosave cannot overwrite a newer edit + Save draft (server, UI, fresh load)", async () => {
    await openHero(page);
    const overlay = page.getByLabel("Hero overlay opacity", { exact: true });
    await overlay.fill("0.6");
    await expect.poll(async () => (await heroProps()).overlayOpacity, { timeout: 30_000 }).toBe(0.6);
    // The server merges each save into the stored props, so a late save only loses data when it
    // carries an OLDER value for the same field: hold a save carrying overlay 0.45 …
    holdNextPatch = true;
    await page.getByLabel("Hero height", { exact: true }).selectOption("70vh");
    await overlay.fill("0.45");
    await page.waitForTimeout(900); // … the autosave (70vh, 0.45) is sent — and held
    // … then make the newer edit and save it explicitly.
    await overlay.fill("0.3");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();

    await expectStoredAndStable((p) => p.minHeight === "70vh" && p.overlayOpacity === 0.3, "height and the newer overlay stored");
    await expect(page.getByLabel("Hero overlay opacity", { exact: true }), "UI keeps the newer overlay").toHaveValue("0.3");
    await expect(page.getByLabel("Hero height", { exact: true })).toHaveValue("70vh");
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();

    const fresh = await ctx.newPage();
    await fresh.goto(`/create/${seed.projectId}`, { waitUntil: "networkidle" });
    await openBuilder(fresh);
    await openHero(fresh);
    const view = { overlay: await fresh.getByLabel("Hero overlay opacity", { exact: true }).inputValue(), height: await fresh.getByLabel("Hero height", { exact: true }).inputValue() };
    await fresh.close();
    evidence.race = { stored: await heroProps(), freshView: view };
    expect(view).toEqual({ overlay: "0.3", height: "70vh" });
  });

  test("Undo while an autosave is in flight: the undone state wins; one click = one batch write", async () => {
    await openHero(page);
    const original = headingFor(PREFIX, "alpha");
    await expect(page.getByLabel("Hero heading", { exact: true })).toHaveValue(original);
    batchRequests.length = 0;
    holdNextPatch = true;
    await page.getByLabel("Hero heading", { exact: true }).fill(`${original} EDIT`);
    await page.waitForTimeout(900); // the heading autosave is sent — and held
    await page.getByRole("button", { name: "Undo", exact: true }).click();

    await expectStoredAndStable((p) => p.heading === original, "undone heading stored");
    await expect(page.getByLabel("Hero heading", { exact: true }), "UI shows the undone heading").toHaveValue(original);
    evidence.undoInFlight = { stored: await heroProps(), batchRequests: batchRequests.length };
    expect(batchRequests, "one Undo click → one batch write").toHaveLength(1);
  });

  test("two quick Undos while a save is in flight: one batch write carrying the newest state", async () => {
    await openHero(page);
    const heading = page.getByLabel("Hero heading", { exact: true });
    const E1 = `${PREFIX}E1`, E2 = `${PREFIX}E2`, E3 = `${PREFIX}E3`;
    await heading.fill(E1);
    await expect.poll(async () => (await heroProps()).heading, { timeout: 30_000 }).toBe(E1);
    await heading.fill(E2);
    await expect.poll(async () => (await heroProps()).heading, { timeout: 30_000 }).toBe(E2);
    batchRequests.length = 0;
    holdNextPatch = true;
    await heading.fill(E3);
    await page.waitForTimeout(900); // the E3 autosave is sent — and held
    const undo = page.getByRole("button", { name: "Undo", exact: true });
    await undo.click();
    await undo.click();

    await expectStoredAndStable((p) => p.heading === E1, "the state after both Undos is stored");
    await expect(heading, "UI shows the state after both Undos").toHaveValue(E1);
    const bodies = batchRequests.map((b) => JSON.parse(b) as { updates: { id: string; props: Record<string, unknown> }[] });
    evidence.rapidUndo = { stored: await heroProps(), batches: bodies.map((b) => b.updates.map((u) => ({ id: u.id, heading: u.props.heading }))) };
    expect(bodies, "two Undo clicks while a save is in flight → one batch write").toHaveLength(1);
    expect(bodies[0]!.updates.map((u) => [u.id, u.props.heading])).toEqual([[seed.sectionIds.alpha, E1]]);
  });

  test("an edit made while an Undo is being written is sent after it and wins (server, UI, fresh load)", async () => {
    await openHero(page);
    const heading = page.getByLabel("Hero heading", { exact: true });
    const E4 = `${PREFIX}E4 after undo`;
    writeLog.length = 0;
    holdNextBatch = true;
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(heading).not.toHaveValue(`${PREFIX}E1`);
    await heading.fill(E4); // while the Undo's batch write is held

    await expectStoredAndStable((p) => p.heading === E4, "the edit made after Undo is stored");
    await expect(heading).toHaveValue(E4);
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    evidence.editAfterUndo = { writeLog: [...writeLog], stored: await heroProps() };
    const batchDone = writeLog.indexOf("batch:done");
    const firstPatch = writeLog.indexOf("patch:sent");
    expect(batchDone, `batch finished (${writeLog.join(", ")})`).toBeGreaterThanOrEqual(0);
    expect(firstPatch, `the edit's PATCH is sent only after the Undo's batch finished (${writeLog.join(", ")})`).toBeGreaterThan(batchDone);

    const fresh = await ctx.newPage();
    await fresh.goto(`/create/${seed.projectId}`, { waitUntil: "networkidle" });
    await openBuilder(fresh);
    await openHero(fresh);
    const view = await fresh.getByLabel("Hero heading", { exact: true }).inputValue();
    await fresh.close();
    expect(view).toBe(E4);
  });
});
