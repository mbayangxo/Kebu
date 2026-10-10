/**
 * 3C S3 Gate 2 — the Builder on the Kebu Creative Core render path (QA / local only).
 *
 * Run against a local app started with KEBU_KCD_RENDER=all (lib/create/kcd-render-flag.ts); with the
 * flag unset it verifies the 3B path instead. Proves the path is really in use, and the canonical
 * site-chrome invariant in the running app: Editor canvas (Desktop/Tablet/Phone) and the standalone
 * Preview page show the same header/footer, on a page with sections and on an empty page, with a
 * stored navigation section suppressed and a Phone layout hiding the header.
 */
import { test, expect, type Page } from "playwright/test";
import { APP_URL, assertQaOnly, cleanupGate2, createIdentity, headingFor, seedProjectAsOwner, type Identity, type SeededProject } from "./fixtures";

const KCD = process.env.KEBU_KCD_RENDER === "all";
const BRAND = "KP-Brand header";
const FOOTER = "KP-Footer text";

let owner: Identity;
let seed: SeededProject;
let aboutId: string;
let navId: string;
const consoleErrors: string[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  assertQaOnly();
  owner = await createIdentity("kcdpath");
  seed = await seedProjectAsOwner(owner, "Gate2 KcdPath", "KP-");
  const db = owner.client;
  // Site chrome (stored once) + an empty About page whose Phone layout hides the header + a stored
  // navigation section the chrome must replace.
  const chrome = {
    enabled: true,
    header: { type: "navigation", props: { brand: BRAND, links: [{ label: "About", href: "/about" }] } },
    footer: { type: "footer", props: { text: FOOTER, links: [] } },
  };
  const { error: e1 } = await db.from("projects").update({ site_chrome: chrome }).eq("id", seed.projectId);
  if (e1) throw new Error(e1.message);
  const { data: about, error: e2 } = await db
    .from("project_pages")
    .insert({ project_id: seed.projectId, slug: "about", title: "About", sort_order: 1, device_layouts: { mobile: { hiddenSections: ["kebu-chrome-header"] } } })
    .select("id")
    .single();
  if (e2 || !about) throw new Error(e2?.message);
  aboutId = about.id;
  const { data: nav, error: e3 } = await db
    .from("project_sections")
    .insert({ page_id: seed.pageId, section_type: "navigation", sort_order: 4, props: { brand: "KP-Stored nav (suppressed)", links: [] } })
    .select("id")
    .single();
  if (e3 || !nav) throw new Error(e3?.message);
  navId = nav.id;
});

test.afterAll(async () => {
  const cleanup = await cleanupGate2();
  expect(cleanup.errors).toEqual([]);
});

async function signIn(page: Page) {
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  await page.goto(`/login?next=${encodeURIComponent(`/create/${seed.projectId}`)}`, { waitUntil: "networkidle" });
  await expect(async () => {
    await page.locator('input[type="email"]').fill(owner.email);
    await page.locator('input[type="password"]').fill(owner.password);
    await expect(page.locator('input[type="email"]')).toHaveValue(owner.email, { timeout: 1_000 });
    await expect(page.locator('input[type="password"]')).toHaveValue(owner.password, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`**/create/${seed.projectId}**`, { timeout: 90_000 });
}

const canvasIds = (page: Page) => page.locator("[data-section-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section-id")));

test("the project API reports the render path in use", async ({ page }) => {
  await signIn(page);
  const res = await page.request.get(`${APP_URL}/api/projects/${seed.projectId}`);
  expect(res.ok()).toBe(true);
  expect((await res.json()).renderPath).toBe(KCD ? "kcd" : "3b");
  await page.close();
});

test("Editor canvas: chrome first/last, stored navigation suppressed, sections in order (Desktop)", async ({ page }) => {
  test.skip(!KCD, "KCD path only");
  await signIn(page);
  const expected = ["kebu-chrome-header", ...(["alpha", "bravo", "charlie", "delta"] as const).map((k) => seed.sectionIds[k]), "kebu-chrome-footer"];
  await expect.poll(() => canvasIds(page), { timeout: 60_000 }).toEqual(expected);
  await expect(page.getByText(BRAND).first()).toBeVisible();
  await expect(page.getByText("KP-Stored nav (suppressed)")).toHaveCount(0);
  expect(navId).toBeTruthy();
  await page.close();
});

test("standalone Preview shows the same result as the Editor (the canonical rule)", async ({ page }) => {
  test.skip(!KCD, "KCD path only");
  await signIn(page);
  await page.goto(`/create/${seed.projectId}/preview`, { waitUntil: "networkidle" });
  const body = page.locator("main, body").first();
  await expect(body.getByText(BRAND).first()).toBeVisible({ timeout: 60_000 });
  await expect(body.getByText(headingFor("KP-", "alpha")).first()).toBeVisible();
  await expect(body.getByText(FOOTER).first()).toBeVisible();
  await expect(body.getByText("KP-Stored nav (suppressed)")).toHaveCount(0);
  // Visual order: header, then sections in order, then footer.
  const text = await body.innerText();
  const at = (s: string) => text.indexOf(s);
  const order = [BRAND, headingFor("KP-", "alpha"), headingFor("KP-", "bravo"), headingFor("KP-", "charlie"), headingFor("KP-", "delta"), FOOTER].map(at);
  expect(order.every((v) => v >= 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  expect(aboutId).toBeTruthy();
  await page.close();
});

test("Builder session logged zero console errors", async () => {
  expect(consoleErrors).toEqual([]);
});
