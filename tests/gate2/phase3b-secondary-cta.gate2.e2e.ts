/**
 * O6 — template second call-to-action (and the editorial-hero legacy template shape), QA only.
 *
 * An editorial-hero row stored with the design-world template fields (eyebrow, primaryCta,
 * secondaryCta, overlay, textAlign, backgroundImageUrl) — as a template instance holds them — must
 * show both buttons and the eyebrow in the Builder, keep them through an edit, Save, reload and
 * Publish, and let the second button be edited (base and Phone-only). The editorial-hero photo and
 * height controls (which wrote fields the schema dropped) must persist. The standard Hero gets the
 * same second button. Screenshots are written for human visual review of the new second button.
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
const PREFIX = "G2C-";
const PHOTO_FILE = join(process.cwd(), "public/templates/maylecor/may-cutout-full.jpg");
const WIDTHS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 390, height: 844 },
] as const;
const EDITORIAL_HEADING = `${PREFIX}EDITORIAL hero`;
const LEGACY = {
  heading: EDITORIAL_HEADING,
  subheading: "Tailleur sur mesure à Dakar",
  eyebrow: "Atelier · Dakar",
  backgroundImageUrl: "",
  overlay: 0.3,
  textAlign: "center",
  primaryCta: { label: "Voir les collections", href: "/collections" },
  secondaryCta: { label: "Prendre rendez-vous", href: "https://wa.me/221780000000" },
};
const evidence: Record<string, unknown> = {};
const consoleProblems: string[] = [];
let owner: Identity;
let seed: SeededProject;
let ctx: BrowserContext;
let page: Page;
let editorialId = "";

const template = (p: Page) => p.locator('section[aria-label="Template"]');
const stored = async (id: string) => (await readPersisted(seed)).props[id] ?? {};
const canvasSection = (p: Page, heading: string) => p.locator("section", { has: p.getByRole("heading", { level: 1, name: heading }) }).last();

async function waitStored(id: string, check: (p: Record<string, unknown>) => boolean, message: string) {
  await expect.poll(async () => check(await stored(id)), { timeout: 30_000, message }).toBe(true);
}

async function openBuilder(p: Page) {
  await expect(template(p).getByRole("button", { name: "Hero banner", exact: true })).toBeVisible({ timeout: 90_000 });
  const closeDial = p.getByRole("button", { name: "Close menu", exact: true });
  if (await closeDial.isVisible()) await closeDial.click();
}

async function openRow(p: Page, label: string) {
  const back = p.getByRole("button", { name: "Back to sections list", exact: true });
  if (await back.isVisible()) await back.click();
  await template(p).getByRole("button", { name: label, exact: true }).click();
}

async function selectDevice(p: Page, device: "Desktop" | "Phone") {
  const btn = p.getByRole("group", { name: "Preview device" }).getByRole("button", { name: device, exact: true });
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
}

async function saveDraft() {
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved", { exact: true })).toBeVisible({ timeout: 30_000 });
}

async function publish() {
  const res = page.waitForResponse((r) => r.url().endsWith(`/api/projects/${seed.projectId}/publish`) && r.request().method() === "POST", { timeout: 90_000 });
  await page.getByRole("button", { name: /^(Publish|Republish)$/ }).click();
  expect((await res).status()).toBe(200);
}

type LiveButtons = { buttons: { text: string; href: string | null }[]; eyebrow: string | null; centered: boolean };
async function liveHero(browser: Browser, heading: string, w: (typeof WIDTHS)[number], shot: string): Promise<LiveButtons> {
  const c = await browser.newContext({ baseURL: APP_URL, viewport: { width: w.width, height: w.height } });
  const p = await c.newPage();
  p.on("console", (m) => { if (m.type() === "error") consoleProblems.push(`live console.error: ${m.text().slice(0, 300)}`); });
  try {
    expect((await p.goto(`/sites/${seed.subdomain}`, { waitUntil: "networkidle" }))?.status()).toBe(200);
    const hero = canvasSection(p, heading);
    await hero.scrollIntoViewIfNeeded();
    await hero.screenshot({ path: join(OUT, `${shot}-hero.png`) });
    await p.screenshot({ path: join(OUT, `${shot}.png`), fullPage: true });
    return await hero.evaluate((el) => ({
      buttons: [...el.querySelectorAll("a")].map((a) => ({ text: (a.textContent ?? "").trim(), href: a.getAttribute("href") })),
      eyebrow: el.querySelector("p.uppercase")?.textContent?.trim() ?? null,
      centered: getComputedStyle(el.querySelector("h1")!).textAlign === "center" || !!el.querySelector(".text-center"),
    }));
  } finally {
    await c.close();
  }
}

async function removeUploadedObjects() {
  const storage = svc().storage.from("site-assets");
  const folder = `${owner.userId}/${seed.projectId}`;
  const { data } = await storage.list(folder, { limit: 100 });
  const paths = (data ?? []).map((o) => `${folder}/${o.name}`);
  if (paths.length) await storage.remove(paths);
  const { data: after } = await storage.list(folder, { limit: 100 });
  return { removed: paths, remaining: (after ?? []).length };
}

test.describe.serial("O6 — second call-to-action and the editorial-hero template shape", () => {
  test.beforeAll(async ({ browser }) => {
    assertQaOnly();
    mkdirSync(OUT, { recursive: true });
    owner = await createIdentity("secondcta");
    seed = await seedProjectAsOwner(owner, "Gate2 SecondCta", PREFIX);
    const { data: row, error } = await owner.client
      .from("project_sections")
      .insert({ page_id: seed.pageId, section_type: "editorial-hero", sort_order: 1, props: LEGACY })
      .select("id")
      .single();
    if (error || !row) throw new Error(`legacy editorial hero insert failed: ${error?.message}`);
    editorialId = row.id as string;
    ctx = await browser.newContext({ baseURL: APP_URL, viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") consoleProblems.push(`console.error: ${m.text().slice(0, 300)}`); });
    page.on("pageerror", (e) => consoleProblems.push(`pageerror: ${e.message.slice(0, 300)}`));
    await page.goto(`/login?next=${encodeURIComponent(`/create/${seed.projectId}`)}`, { waitUntil: "networkidle" });
    await page.locator('input[type="email"]').fill(owner.email);
    await page.locator('input[type="password"]').fill(owner.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(`**/create/${seed.projectId}**`, { timeout: 90_000 });
    await openBuilder(page);
  });

  test.afterAll(async () => {
    await ctx?.close();
    const storage = seed ? await removeUploadedObjects() : null;
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
    evidence.cleanup = { ...cleanup, storage, residue, remainingUsers };
    evidence.consoleProblems = consoleProblems;
    writeFileSync(join(OUT, "secondary-cta-evidence.json"), JSON.stringify(evidence, null, 2));
    if (cleanup.errors.length || remainingUsers.length || storage?.remaining !== 0 || Object.values(residue).some((n) => n !== 0)) {
      throw new Error(`cleanup incomplete: ${JSON.stringify(evidence.cleanup)}`);
    }
  });

  test("a template editorial hero shows both buttons and its eyebrow in the Builder; the inspector shows them", async () => {
    const hero = canvasSection(page, EDITORIAL_HEADING);
    await expect(hero.getByRole("link", { name: "Voir les collections" })).toHaveAttribute("href", "/collections");
    await expect(hero.getByRole("link", { name: "Prendre rendez-vous" })).toHaveAttribute("href", "https://wa.me/221780000000");
    await expect(hero.getByText("Atelier · Dakar", { exact: true })).toBeVisible();
    await openRow(page, "Editorial hero");
    await expect(page.getByLabel("Editorial hero Second button label", { exact: true })).toHaveValue("Prendre rendez-vous");
    await expect(page.getByLabel("Editorial hero Second button link", { exact: true })).toHaveValue("https://wa.me/221780000000");
    await expect(page.getByLabel("Editorial hero eyebrow", { exact: true })).toHaveValue("Atelier · Dakar");
    await expect(page.getByLabel("Editorial hero align", { exact: true })).toHaveValue("center");
    await hero.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(OUT, "O6-builder-editorial-template.png") });
  });

  test("editing the second button: Save → stored → reload → Publish at 1440/768/390", async ({ browser }) => {
    await page.getByLabel("Editorial hero Second button label", { exact: true }).fill("Réserver sur WhatsApp");
    await saveDraft();
    await waitStored(editorialId, (p) => p.secondaryButtonLabel === "Réserver sur WhatsApp" && p.secondaryButtonHref === "https://wa.me/221780000000" && p.buttonLabel === "Voir les collections" && p.eyebrow === "Atelier · Dakar", "edit stored with canonical fields");
    const s = await stored(editorialId);
    evidence.editorialStored = s;
    for (const legacyKey of ["primaryCta", "secondaryCta", "textAlign", "overlay", "backgroundImageUrl"]) expect(s, legacyKey).not.toHaveProperty(legacyKey);

    const fresh = await ctx.newPage();
    await fresh.goto(`/create/${seed.projectId}`, { waitUntil: "networkidle" });
    await openBuilder(fresh);
    await openRow(fresh, "Editorial hero");
    expect(await fresh.getByLabel("Editorial hero Second button label", { exact: true }).inputValue(), "reload").toBe("Réserver sur WhatsApp");
    await fresh.close();

    await publish();
    const live: Record<string, LiveButtons> = {};
    for (const w of WIDTHS) {
      live[w.name] = await liveHero(browser, EDITORIAL_HEADING, w, `O6-live-editorial-${w.name}-${w.width}`);
      expect(live[w.name]!.buttons, `@${w.width}`).toEqual([
        { text: "Voir les collections", href: "/collections" },
        { text: "Réserver sur WhatsApp", href: "https://wa.me/221780000000" },
      ]);
      expect(live[w.name]!.eyebrow, `@${w.width}`).toBe("Atelier · Dakar");
    }
    evidence.editorialLive = live;
  });

  test("a Phone-only second-button label appears only on Phone", async ({ browser }) => {
    await selectDevice(page, "Phone");
    await openRow(page, "Editorial hero");
    await page.getByLabel("Editorial hero Second button label", { exact: true }).fill("WhatsApp");
    await saveDraft();
    await waitStored(editorialId, (p) => (p.deviceOverrides as { mobile?: Record<string, unknown> } | undefined)?.mobile?.secondaryButtonLabel === "WhatsApp" && p.secondaryButtonLabel === "Réserver sur WhatsApp", "Phone override stored, base unchanged");
    await selectDevice(page, "Desktop");
    await publish();
    const phone = await liveHero(browser, EDITORIAL_HEADING, WIDTHS[2], "O6-live-editorial-phone-override-390");
    const desktop = await liveHero(browser, EDITORIAL_HEADING, WIDTHS[0], "O6-live-editorial-desktop-after-phone-edit-1440");
    evidence.deviceOverride = { phone: phone.buttons, desktop: desktop.buttons };
    expect(phone.buttons[1]?.text).toBe("WhatsApp");
    expect(desktop.buttons[1]?.text).toBe("Réserver sur WhatsApp");
  });

  test("the editorial-hero photo and height controls persist (they wrote fields the schema dropped)", async () => {
    await openRow(page, "Editorial hero");
    const field = page.locator("div.rounded-xl", { has: page.getByText("Background image", { exact: true }) });
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), field.getByRole("button", { name: "Upload photo", exact: true }).click()]);
    await chooser.setFiles(PHOTO_FILE);
    await expect(field.getByRole("button", { name: "Remove", exact: true })).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("Editorial hero height", { exact: true }).selectOption("70");
    await saveDraft();
    await waitStored(editorialId, (p) => typeof p.imageUrl === "string" && p.imageUrl.includes(`/${seed.projectId}/`) && p.heightVh === 70, "photo (imageUrl) and height (heightVh) stored");
    const s = await stored(editorialId);
    evidence.editorialPhotoHeight = { imageUrl: s.imageUrl, heightVh: s.heightVh };

    const fresh = await ctx.newPage();
    await fresh.goto(`/create/${seed.projectId}`, { waitUntil: "networkidle" });
    await openBuilder(fresh);
    await openRow(fresh, "Editorial hero");
    await expect(fresh.getByLabel("Editorial hero height", { exact: true })).toHaveValue("70");
    await expect(canvasSection(fresh, EDITORIAL_HEADING).locator("img").first()).toHaveAttribute("src", String(s.imageUrl));
    await canvasSection(fresh, EDITORIAL_HEADING).scrollIntoViewIfNeeded();
    await fresh.screenshot({ path: join(OUT, "O6-builder-editorial-photo.png") });
    await fresh.close();
  });

  test("the standard Hero's second button: inspector → Save → reload → Publish", async ({ browser }) => {
    const heading = headingFor(PREFIX, "alpha");
    await openRow(page, "Hero banner");
    await page.getByLabel("Button label", { exact: true }).fill("Shop now");
    await page.getByLabel("Second button label", { exact: true }).fill("Our story");
    await page.getByLabel("Second button link", { exact: true }).fill("/about");
    await saveDraft();
    await waitStored(seed.sectionIds.alpha, (p) => p.secondaryButtonLabel === "Our story" && p.secondaryButtonHref === "/about", "stored");
    const fresh = await ctx.newPage();
    await fresh.goto(`/create/${seed.projectId}`, { waitUntil: "networkidle" });
    await openBuilder(fresh);
    await openRow(fresh, "Hero banner");
    expect(await fresh.getByLabel("Second button label", { exact: true }).inputValue()).toBe("Our story");
    await canvasSection(fresh, heading).scrollIntoViewIfNeeded();
    await fresh.screenshot({ path: join(OUT, "O6-builder-hero-second-button.png") });
    await fresh.close();

    await publish();
    const live: Record<string, LiveButtons> = {};
    for (const w of WIDTHS) {
      live[w.name] = await liveHero(browser, heading, w, `O6-live-hero-${w.name}-${w.width}`);
      expect(live[w.name]!.buttons, `@${w.width}`).toEqual([{ text: "Shop now", href: "#" }, { text: "Our story", href: "/about" }]);
    }
    evidence.heroLive = live;
    expect(consoleProblems, "no console errors in the Builder or on the live site").toEqual([]);
  });
});
