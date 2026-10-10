/**
 * Standard Hero — Builder → save → reload → preview → publish, in a real browser (QA only).
 *
 *   H1  A Hero added in the Builder defaults to Auto (fits content); every explicit height
 *       (Half / Tall / Hero 80vh / Full screen, and Auto) round-trips and publishes. A legacy
 *       Hero with no stored height keeps rendering at 80vh.
 *   H2  A background image uploaded in the inspector and the Overlay slider persist and publish.
 *   H3  Text align set while editing Phone is stored per device and renders only on Phone.
 *   H4  The Aesthetic Editor's "Hero background photo" reaches the standard Hero.
 *
 * Published pages are measured and captured at 1440, 768 and 390px. The Builder session must
 * log zero console errors. Synthetic data (rows and uploaded storage objects) is removed and
 * verified in afterAll.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Browser, type BrowserContext, type Page } from "playwright/test";
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
const PREFIX = "G2H-";
const NEW_HEADING = "G2H NEW hero";
const PHOTO_FILE = join(process.cwd(), "public/templates/maylecor/may-cutout-full.jpg");
const WIDTHS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 390, height: 844 },
] as const;
const VH: Record<string, number> = { "50vh": 0.5, "70vh": 0.7, "80vh": 0.8, "100vh": 1 };

const evidence: Record<string, unknown> = {};
const consoleProblems: string[] = [];
let owner: Identity;
let seed: SeededProject;
let ctx: BrowserContext;
let page: Page;
let newHeroId = "";

const record = (key: string, value: unknown) => { evidence[key] = value; };

async function signIn(p: Page) {
  await p.goto(`/login?next=${encodeURIComponent(`/create/${seed.projectId}`)}`, { waitUntil: "networkidle" });
  await expect(async () => {
    await p.locator('input[type="email"]').fill(owner.email);
    await p.locator('input[type="password"]').fill(owner.password);
    await expect(p.locator('input[type="email"]')).toHaveValue(owner.email, { timeout: 1_000 });
    await expect(p.locator('input[type="password"]')).toHaveValue(owner.password, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
  await p.waitForURL(`**/create/${seed.projectId}**`, { timeout: 90_000 });
}

const template = (p: Page) => p.locator('section[aria-label="Template"]');
const heroRows = (p: Page) => template(p).getByRole("button", { name: "Hero banner", exact: true });

async function waitForBuilder(p: Page) {
  await expect(heroRows(p).first()).toBeVisible({ timeout: 90_000 });
  // The Yande speed-dial opens on load and its backdrop swallows the first click (recorded finding).
  const closeDial = p.getByRole("button", { name: "Close menu", exact: true });
  if (await closeDial.isVisible()) await closeDial.click();
  await expect(p.getByRole("button", { name: "Open Yande", exact: true })).toBeVisible();
}

async function reloadBuilder() {
  await page.reload({ waitUntil: "networkidle" });
  await waitForBuilder(page);
}

async function backToList() {
  const back = page.getByRole("button", { name: "Back to sections list", exact: true });
  if (await back.isVisible()) await back.click();
  await expect(template(page)).toBeVisible();
}

/** Open the new Hero's inspector (it is the last "Hero banner" row; verified by its heading). */
async function openNewHero() {
  await backToList();
  await heroRows(page).last().click();
  await expect(page.getByLabel("Hero heading", { exact: true })).toHaveValue(NEW_HEADING);
}

async function selectDevice(device: "Desktop" | "Tablet" | "Phone") {
  const btn = page.getByRole("group", { name: "Preview device" }).getByRole("button", { name: device, exact: true });
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
}

async function saveDraft() {
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
}

async function heroProps(id: string): Promise<Record<string, unknown>> {
  return (await readPersisted(seed)).props[id] ?? {};
}

async function waitStored(id: string, check: (p: Record<string, unknown>) => boolean, message: string) {
  await expect.poll(async () => check(await heroProps(id)), { timeout: 30_000, message }).toBe(true);
}

/** The Builder canvas (Desktop) Hero element for a section. */
const canvasHero = (id: string) => page.locator(`[data-section-id="${id}"] section[data-hero-height]`);

async function publish(tag: string) {
  const res = page.waitForResponse((r) => r.url().endsWith(`/api/projects/${seed.projectId}/publish`) && r.request().method() === "POST", { timeout: 90_000 });
  await page.getByRole("button", { name: /^(Publish|Republish)$/ }).click();
  const r = await res;
  expect(r.status(), `publish (${tag}) failed: ${await r.text()}`).toBe(200);
}

type LiveHero = {
  status: number;
  heightAttr: string | null;
  minHeight: string;
  rectHeight: number;
  viewportHeight: number;
  contentHeight: number;
  viewportWidth: number;
  paddingTop: number;
  paddingBottom: number;
  imgSrc: string | null;
  overlayBackground: string | null;
  textCentered: boolean;
  /** Hero nodes removed from the rendered page (a replaced node is recorded, not hidden). */
  heroNodeRemovals: number;
  /** Hero moved out of React's hidden streaming holder into place (expected with streaming SSR). */
  heroStreamMoves: number;
};

/** Load the published page at a width, measure the Hero with `heading`, and capture it. */
async function liveHero(browser: Browser, heading: string, w: (typeof WIDTHS)[number], shot: string): Promise<LiveHero> {
  const c = await browser.newContext({ baseURL: APP_URL, viewport: { width: w.width, height: w.height } });
  await c.addInitScript(() => {
    const w = window as unknown as { __heroRemovals: number; __heroStreamMoves: number };
    w.__heroRemovals = 0;
    w.__heroStreamMoves = 0;
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of m.removedNodes) {
          if (!(n instanceof Element && (n.matches("section[data-hero-height]") || n.querySelector("section[data-hero-height]")))) continue;
          // React streaming SSR moves completed content out of a hidden <div id="S:…"> holder.
          const from = m.target as Element;
          if (from instanceof HTMLElement && from.hidden && /^S:/.test(from.id)) w.__heroStreamMoves++;
          else w.__heroRemovals++;
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const p = await c.newPage();
  const problems: string[] = [];
  p.on("console", (m) => { if (m.type() === "error") problems.push(m.text().slice(0, 300)); });
  p.on("pageerror", (e) => problems.push(e.message.slice(0, 300)));
  try {
    const res = await p.goto(`/sites/${seed.subdomain}`, { waitUntil: "networkidle", timeout: 90_000 });
    const hero = p.locator("section[data-hero-height]").filter({ has: p.getByRole("heading", { name: heading, exact: true }) });
    await expect(hero).toHaveCount(1);
    let m: Omit<LiveHero, "status" | "heroNodeRemovals" | "heroStreamMoves"> | undefined;
    // Retried if the node is replaced mid-measurement; replacements are counted in heroNodeRemovals.
    await expect(async () => {
      await hero.scrollIntoViewIfNeeded({ timeout: 2_000 });
      m = await hero.evaluate((el) => {
      const content = el.querySelector(":scope > div.relative.z-10") as HTMLElement | null;
      const img = el.querySelector(":scope > img") as HTMLImageElement | null;
      const overlay = el.querySelector(":scope > div.absolute.inset-0") as HTMLElement | null;
      return {
        heightAttr: el.getAttribute("data-hero-height"),
        minHeight: getComputedStyle(el).minHeight,
        rectHeight: el.getBoundingClientRect().height,
        viewportHeight: window.innerHeight,
        contentHeight: content?.getBoundingClientRect().height ?? -1,
        viewportWidth: window.innerWidth,
        paddingTop: content ? parseFloat(getComputedStyle(content).paddingTop) : -1,
        paddingBottom: content ? parseFloat(getComputedStyle(content).paddingBottom) : -1,
        imgSrc: img?.getAttribute("src") ?? null,
        overlayBackground: overlay ? getComputedStyle(overlay).backgroundImage : null,
        textCentered: content?.classList.contains("text-center") ?? false,
      };
      }, undefined, { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    if (!m) throw new Error("hero not measured");
    const { heroNodeRemovals, heroStreamMoves } = await p.evaluate(() => {
      const w = window as unknown as { __heroRemovals: number; __heroStreamMoves: number };
      return { heroNodeRemovals: w.__heroRemovals, heroStreamMoves: w.__heroStreamMoves };
    });
    await p.screenshot({ path: join(OUT, `${shot}.png`), fullPage: true });
    await hero.screenshot({ path: join(OUT, `${shot}-hero.png`) });
    expect(problems, `console errors on published page (${shot})`).toEqual([]);
    return { status: res?.status() ?? 0, ...m, heroNodeRemovals, heroStreamMoves };
  } finally {
    await c.close();
  }
}

function expectHeight(h: LiveHero, height: string, where: string) {
  expect(h.heightAttr, `${where}: data-hero-height`).toBe(height);
  if (height === "auto") {
    expect(["auto", "0px"], `${where}: no min-height`).toContain(h.minHeight);
    // Fits content: the section is exactly as tall as its content block.
    expect(Math.abs(h.rectHeight - h.contentHeight), `${where}: height fits content`).toBeLessThanOrEqual(1);
    // Balanced padding stepped by device: Phone 64 / Tablet 80 / Desktop 96.
    const pad = h.viewportWidth >= 1024 ? 96 : h.viewportWidth >= 640 ? 80 : 64;
    expect({ top: h.paddingTop, bottom: h.paddingBottom }, `${where}: balanced Auto padding`).toEqual({ top: pad, bottom: pad });
  } else {
    expect(h.rectHeight, `${where}: at least ${height}`).toBeGreaterThanOrEqual(h.viewportHeight * VH[height]! - 1);
    // Explicit (and legacy) heights keep the bottom-anchored layout.
    expect({ top: h.paddingTop, bottom: h.paddingBottom }, `${where}: bottom-anchored padding`).toEqual({ top: 128, bottom: 64 });
  }
}

async function removeUploadedObjects(): Promise<{ removed: string[]; remaining: number; error?: string }> {
  const storage = svc().storage.from("site-assets");
  const folder = `${owner.userId}/${seed.projectId}`;
  const { data, error } = await storage.list(folder, { limit: 100 });
  if (error) return { removed: [], remaining: -1, error: error.message };
  const paths = (data ?? []).map((o) => `${folder}/${o.name}`);
  if (paths.length) {
    const { error: rmErr } = await storage.remove(paths);
    if (rmErr) return { removed: [], remaining: -1, error: rmErr.message };
  }
  const { data: after } = await storage.list(folder, { limit: 100 });
  return { removed: paths, remaining: (after ?? []).length };
}

test.describe.serial("Standard Hero — height, image, overlay, device align, Aesthetic photo", () => {
  test.beforeAll(async ({ browser }) => {
    assertQaOnly();
    mkdirSync(OUT, { recursive: true });
    owner = await createIdentity("heroowner");
    seed = await seedProjectAsOwner(owner, "Gate2 Hero", PREFIX);
    ctx = await browser.newContext({ baseURL: APP_URL, viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") consoleProblems.push(`console.error: ${m.text().slice(0, 300)}`); });
    page.on("pageerror", (e) => consoleProblems.push(`pageerror: ${e.message.slice(0, 300)}`));
    await signIn(page);
    await waitForBuilder(page);
  });

  test.afterAll(async () => {
    await ctx?.close();
    const storage = seed ? await removeUploadedObjects() : null;
    const cleanup = await cleanupGate2();
    const db = svc();
    const residue: Record<string, number> = {};
    for (const table of ["projects", "project_pages", "deployments", "site_subscriptions", "website_versions", "website_assets", "site_analytics_events"]) {
      const col = table === "projects" ? "id" : "project_id";
      const { count, error } = await db.from(table).select("*", { count: "exact", head: true }).in(col, cleanup.projects);
      residue[table] = error ? -1 : count ?? -1;
    }
    const remainingUsers: string[] = [];
    for (const id of cleanup.users) if ((await db.auth.admin.getUserById(id)).data?.user) remainingUsers.push(id);
    record("cleanup", { ...cleanup, storage, residue, remainingUsers });
    record("builderConsoleProblems", consoleProblems);
    writeFileSync(join(OUT, "hero-evidence.json"), JSON.stringify(evidence, null, 2));
    if (cleanup.errors.length || remainingUsers.length || Object.values(residue).some((n) => n !== 0) || storage?.remaining !== 0) {
      throw new Error(`cleanup incomplete: ${JSON.stringify(evidence.cleanup)}`);
    }
  });

  test("H1a. a Hero added in the Builder defaults to Auto; the legacy Hero keeps 80vh", async ({ browser }) => {
    const before = new Set(Object.keys((await readPersisted(seed)).props));
    await backToList();
    // The sidebar "+ Add section" control (its accessible name includes the "+" glyph).
    await page.getByRole("button", { name: /^\+\s*Add section$/ }).first().click();
    const picker = page.getByRole("dialog", { name: "Add a section" });
    await picker.locator("button", { has: page.getByText("Hero banner", { exact: true }) }).click();

    await expect.poll(async () => {
      const ids = Object.keys((await readPersisted(seed)).props).filter((id) => !before.has(id));
      newHeroId = ids[0] ?? "";
      return ids.length;
    }, { timeout: 30_000, message: "new Hero row stored" }).toBe(1);

    const stored = await heroProps(newHeroId);
    record("H1a.storedOnAdd", stored);
    expect(stored.minHeight, "new Hero stored with an explicit Auto height").toBe("auto");
    expect((await heroProps(seed.sectionIds.alpha)).minHeight, "legacy Hero has no stored height").toBeUndefined();

    // The inspector opens on the new Hero; give it a recognisable heading.
    await expect(page.getByLabel("Hero height", { exact: true })).toHaveValue("auto");
    await page.getByLabel("Hero heading", { exact: true }).fill(NEW_HEADING);
    await saveDraft();
    await waitStored(newHeroId, (p) => p.heading === NEW_HEADING && p.minHeight === "auto", "heading saved, height still auto");

    await reloadBuilder();
    await openNewHero();
    await expect(page.getByLabel("Hero height", { exact: true })).toHaveValue("auto");
    await expect(canvasHero(newHeroId)).toHaveAttribute("data-hero-height", "auto");
    await expect(canvasHero(seed.sectionIds.alpha)).toHaveAttribute("data-hero-height", "80vh");
    await canvasHero(newHeroId).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(OUT, "H1-builder-auto-desktop.png") });
    // The same Auto Hero in the Builder's Tablet (768) and Phone (390) previews.
    for (const [device, frame] of [["Tablet", "tablet"], ["Phone", "mobile"]] as const) {
      await selectDevice(device);
      const hero = page.frameLocator(`iframe[title="${frame} preview"]`).locator(`[data-section-id="${newHeroId}"] section[data-hero-height]`);
      await expect(hero).toHaveAttribute("data-hero-height", "auto");
      await hero.scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(OUT, `H1-builder-auto-${device.toLowerCase()}.png`) });
    }
    await selectDevice("Desktop");

    await backToList();
    await heroRows(page).first().click();
    await expect(page.getByLabel("Hero height", { exact: true }), "legacy Hero shows the 80vh it renders at").toHaveValue("80vh");

    await publish("auto");
    const live: Record<string, LiveHero> = {};
    for (const w of WIDTHS) {
      live[w.name] = await liveHero(browser, NEW_HEADING, w, `H1a-live-auto-${w.name}-${w.width}`);
      expect(live[w.name]!.status).toBe(200);
      expectHeight(live[w.name]!, "auto", `new Hero @${w.width}`);
      const legacy = await liveHero(browser, headingFor(PREFIX, "alpha"), w, `H1-live-legacy-${w.name}-${w.width}`);
      expectHeight(legacy, "80vh", `legacy Hero @${w.width}`);
      live[`legacy-${w.name}`] = legacy;
    }
    record("H1a.live", live);
  });

  for (const height of ["50vh", "70vh", "80vh", "100vh", "auto"]) {
    test(`H1b. height "${height}" round-trips Builder → save → reload → preview → publish`, async ({ browser }) => {
      await openNewHero();
      await page.getByLabel("Hero height", { exact: true }).selectOption(height);
      await saveDraft();
      await waitStored(newHeroId, (p) => p.minHeight === height, `minHeight ${height} stored`);

      await reloadBuilder();
      await openNewHero();
      await expect(page.getByLabel("Hero height", { exact: true })).toHaveValue(height);
      await expect(canvasHero(newHeroId)).toHaveAttribute("data-hero-height", height);

      await publish(height);
      const live: Record<string, LiveHero> = {};
      for (const w of WIDTHS) {
        live[w.name] = await liveHero(browser, NEW_HEADING, w, `H1-live-${height}-${w.name}-${w.width}`);
        expectHeight(live[w.name]!, height, `${height} @${w.width}`);
      }
      record(`H1b.${height}`, live);
    });
  }

  test("H2. inspector background image upload and overlay persist and publish", async ({ browser }) => {
    await openNewHero();
    const field = page.locator("div.rounded-xl", { has: page.getByText("Background image (optional)", { exact: true }) });
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), field.getByRole("button", { name: "Upload photo", exact: true }).click()]);
    await chooser.setFiles(PHOTO_FILE);
    await expect(field.getByRole("button", { name: "Remove", exact: true })).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("Hero overlay opacity", { exact: true }).fill("0.6");
    await saveDraft();
    await waitStored(newHeroId, (p) => typeof p.image === "string" && p.image.includes(`/${seed.projectId}/`) && p.overlayOpacity === 0.6, "image and overlay stored");
    const stored = await heroProps(newHeroId);
    record("H2.stored", { image: stored.image, overlayOpacity: stored.overlayOpacity });

    await reloadBuilder();
    await openNewHero();
    await expect(page.getByLabel("Hero overlay opacity", { exact: true })).toHaveValue("0.6");
    await expect(canvasHero(newHeroId).locator(":scope > img")).toHaveAttribute("src", String(stored.image));
    await canvasHero(newHeroId).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(OUT, "H2-builder-image-overlay.png") });

    await publish("image");
    const live: Record<string, LiveHero> = {};
    for (const w of WIDTHS) {
      live[w.name] = await liveHero(browser, NEW_HEADING, w, `H2-live-image-${w.name}-${w.width}`);
      expect(live[w.name]!.imgSrc, `published image @${w.width}`).toBe(stored.image);
      expect(live[w.name]!.overlayBackground, `overlay 0.6 drives the gradient @${w.width}`).toContain("rgba(0, 0, 0, 0.88)");
    }
    record("H2.live", live);
  });

  test("H3. text align set while editing Phone renders only on Phone", async ({ browser }) => {
    await openNewHero();
    await selectDevice("Phone");
    // The select sits inside its <label>, so the label's name also carries the option text.
    await page.getByLabel(/^Text align/).selectOption("left");
    await saveDraft();
    await waitStored(newHeroId, (p) => (p.deviceOverrides as { mobile?: { align?: string } } | undefined)?.mobile?.align === "left" && p.align === "center", "Phone align override stored; base stays center");
    await selectDevice("Desktop");
    await publish("align");
    const phone = await liveHero(browser, NEW_HEADING, WIDTHS[2], "H3-live-align-phone-390");
    const tablet = await liveHero(browser, NEW_HEADING, WIDTHS[1], "H3-live-align-tablet-768");
    const desktop = await liveHero(browser, NEW_HEADING, WIDTHS[0], "H3-live-align-desktop-1440");
    record("H3.live", { phone: phone.textCentered, tablet: tablet.textCentered, desktop: desktop.textCentered });
    expect(phone.textCentered, "Phone is left-aligned").toBe(false);
    expect(tablet.textCentered, "Tablet stays centered").toBe(true);
    expect(desktop.textCentered, "Desktop stays centered").toBe(true);
  });

  test("H4. the Aesthetic Editor's Hero background photo reaches the standard Hero", async () => {
    await backToList();
    await page.getByRole("button", { name: "Aesthetic Editor", exact: true }).click();
    await expect(page.getByText("Motion hero accent"), "no no-op accent control for a standard Hero").toHaveCount(0);
    const background = page.getByRole("button", { name: "Background", exact: true });
    if ((await background.getAttribute("aria-expanded")) !== "true") await background.click();
    const field = page.locator("div.rounded-xl", { has: page.getByText("Hero background photo", { exact: true }) });
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), field.getByRole("button", { name: "Upload photo", exact: true }).click()]);
    await chooser.setFiles(PHOTO_FILE);
    await waitStored(seed.sectionIds.alpha, (p) => typeof p.image === "string" && p.image.includes(`/${seed.projectId}/`), "Aesthetic photo stored as the Hero image");
    const stored = await heroProps(seed.sectionIds.alpha);
    record("H4.stored", { image: stored.image, backgroundImage: stored.backgroundImage ?? null, minHeight: stored.minHeight ?? null });
    expect(stored.backgroundImage, "no stray backgroundImage key").toBeUndefined();
    expect(stored.minHeight, "legacy Hero still has no stored height").toBeUndefined();
    await expect(canvasHero(seed.sectionIds.alpha).locator(":scope > img")).toHaveAttribute("src", String(stored.image));
    await expect(page.getByRole("button", { name: "Logo", exact: true }), "no no-op Logo control for a standard Hero").toHaveCount(0);
    await canvasHero(seed.sectionIds.alpha).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(OUT, "H4-builder-aesthetic-photo.png") });
  });

  test("T1. a Hero saved with legacy template fields shows its image in the Builder, and survives an edit and publish", async ({ browser }) => {
    const LEGACY_HEADING = "G2H LEGACY-FIELDS hero";
    const legacyImage = "/templates/maylecor/may-cutout-full.jpg";
    const { data: row, error } = await owner.client
      .from("project_sections")
      .insert({
        page_id: seed.pageId,
        section_type: "hero",
        sort_order: 50,
        props: { heading: LEGACY_HEADING, subheading: "Legacy template shape", backgroundImageUrl: legacyImage, overlay: 0.35, primaryCta: { label: "Voir les produits", href: "/produits" } },
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(`legacy hero insert failed: ${error?.message}`);
    const legacyId = row.id as string;

    await reloadBuilder();
    await expect(canvasHero(legacyId).locator(":scope > img")).toHaveAttribute("src", legacyImage);
    await expect(canvasHero(legacyId).getByRole("link", { name: "Voir les produits" })).toHaveAttribute("href", "/produits");
    await backToList();
    await heroRows(page).last().click();
    await expect(page.getByLabel("Hero heading", { exact: true })).toHaveValue(LEGACY_HEADING);
    await expect(page.getByLabel("Hero overlay opacity", { exact: true }), "inspector shows the template overlay").toHaveValue("0.35");
    await canvasHero(legacyId).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(OUT, "T1-builder-legacy-fields.png") });

    await page.getByLabel("Hero heading", { exact: true }).fill(`${LEGACY_HEADING} edited`);
    await saveDraft();
    await waitStored(legacyId, (p) => p.heading === `${LEGACY_HEADING} edited` && p.image === legacyImage && p.overlayOpacity === 0.35 && p.buttonLabel === "Voir les produits", "edit stored with canonical fields");
    const stored = await heroProps(legacyId);
    record("T1.stored", stored);
    for (const legacyKey of ["backgroundImageUrl", "overlay", "primaryCta"]) expect(stored, legacyKey).not.toHaveProperty(legacyKey);

    await publish("legacy-fields");
    const live = await liveHero(browser, `${LEGACY_HEADING} edited`, WIDTHS[0], "T1-live-legacy-fields-desktop-1440");
    record("T1.live", live);
    expect(live.imgSrc).toBe(legacyImage);
    expect(live.overlayBackground).toContain(`rgba(0, 0, 0, ${(0.35 + 0.28).toFixed(2)})`);
  });

  test("Builder session logged zero console errors", () => {
    expect(consoleProblems).toEqual([]);
  });
});
