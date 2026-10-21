/**
 * Shared helpers for authenticated Builder E2E tests.
 *
 * All functions assume the live Builder route is reachable.
 * Gate with CAN_TEST_BUILDER before calling — these helpers do not skip
 * themselves; they throw if called without auth.
 */

import { expect, type Page, type BrowserContext } from "playwright/test";
import { builderAuthCookies } from "./e2e-auth-cookies";

export const BASE_URL    = process.env.KEBU_E2E_BASE_URL?.trim().replace(/\/+$/, "") || "http://127.0.0.1:3099";
export const COOKIE      = process.env.KEBU_E2E_BUILDER_COOKIE ?? "";
export const PROJECT_ID  = process.env.KEBU_E2E_PROJECT_ID ?? "";
export const CAN_TEST_BUILDER = Boolean(process.env.KEBU_E2E_BASE_URL?.trim() && COOKIE && PROJECT_ID);
if (process.env.KEBU_REQUIRE_HOSTED_BUILDER_ACCEPTANCE === "1" && !CAN_TEST_BUILDER) {
  throw Error("Required hosted Builder acceptance is blocked: configure the QA origin, actual Supabase cookies and disposable project ID privately.");
}

export const BUILDER_URL = `${BASE_URL}/create/${PROJECT_ID}`;
export const SECTION_SELECTOR = '[aria-label="Site canvas"] [data-kcd-root-id], [aria-label="Site canvas"] [data-section-id]';

// ── auth / navigation ──────────────────────────────────────────────────────

/** Inject the session cookie into the context and navigate to the Builder. */
export async function openBuilder(page: Page): Promise<void> {
  if (process.env.KEBU_E2E_DISPOSABLE_PROJECT !== "1") {
    throw Error("Authenticated Builder mutation tests require an explicitly disposable staging project.");
  }
  await page.context().addCookies(builderAuthCookies(COOKIE, BASE_URL));
  // The render guard refuses native operation mode in production and against
  // the production Supabase ref. Check it before any mutation-capable test.
  const response = await page.request.get(`${BASE_URL}/api/projects/${PROJECT_ID}`);
  let body: { project?: { id?: string; document_schema_version?: string }; renderPath?: string };
  try { body = await response.json(); } catch { throw Error("QA project preflight did not return an authenticated project response."); }
  if (!response.ok() || body.project?.id !== PROJECT_ID || body.project.document_schema_version !== "kcd-1" || body.renderPath !== "kcd") {
    throw Error("QA project is not an authenticated, native non-production fixture; acceptance stopped before mutations.");
  }
  await page.goto(BUILDER_URL, { waitUntil: "domcontentloaded", timeout: 40_000 });
}

/** Wait for the Builder canvas to be interactive. */
export async function waitForBuilder(page: Page): Promise<void> {
  const path = new URL(page.url()).pathname;
  if (!/^\/create\/[a-f\d-]{36}\/?$/i.test(path) || (PROJECT_ID && path !== `/create/${PROJECT_ID}`)) {
    throw Error("Authenticated Builder acceptance did not reach the intended project editor. Sign-in and preview pages are not editor acceptance.");
  }
  await expect(page.getByRole("region", { name: "Site canvas", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Save draft", exact: true }).first()).toBeVisible({ timeout: 30_000 });
}

/** Measure the actual editor, including opening/dismissing its responsive panel. */
export async function expectBuilderViewport(page: Page, width: number): Promise<void> {
  const tools = page.getByRole("toolbar", { name: "Builder tools", exact: true });
  const build = tools.getByRole("button", { name: "Build", exact: true });
  await expect(build).toBeVisible();
  if (await build.getAttribute("aria-pressed") !== "true") await build.click();
  const panel = page.getByRole("complementary", { name: "Section editor", exact: true });
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) throw Error("Section editor has no measurable geometry.");
  if (width < 768) {
    expect(Math.abs(bounds.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds.width - width)).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds.height - page.viewportSize()!.height)).toBeLessThanOrEqual(1);
    await expect(panel).toHaveAttribute("aria-modal", "true");
  } else if (width < 1024) {
    expect(Math.abs(bounds.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds.width - 300)).toBeLessThanOrEqual(1);
    await expect(panel).toHaveAttribute("aria-modal", "true");
  } else {
    expect(Math.abs(bounds.width - 280)).toBeLessThanOrEqual(1);
    await expect(panel).toHaveCSS("position", "relative");
    expect(await panel.getAttribute("aria-modal")).toBeNull();
  }
  if (width < 1024) {
    await panel.getByRole("button", { name: "Done — view site", exact: true }).click();
    await expect(panel).toBeHidden();
  }
  const canvas = await page.getByRole("region", { name: "Site canvas", exact: true }).boundingBox();
  expect(canvas).not.toBeNull();
  expect(canvas!.width).toBeGreaterThan(width * (width < 1024 ? 0.7 : 0.5));
  expect(canvas!.x + canvas!.width).toBeLessThanOrEqual(width + 1);
  await expect(page.getByRole("button", { name: "Save draft", exact: true }).first()).toBeVisible();
}

// ── device mode ────────────────────────────────────────────────────────────

export type DeviceMode = "desktop" | "tablet" | "phone";

/**
 * Click the device-mode toggle for the given mode.
 * Selectors follow the data-testid convention; the spec falls back to
 * aria-label when data-testid is absent.
 */
export async function switchDevice(page: Page, mode: DeviceMode): Promise<void> {
  const ariaLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
  await page.getByRole("button", { name: ariaLabel, exact: true }).first().click({ timeout: 8_000 });
}

// ── sections ───────────────────────────────────────────────────────────────

/**
 * Click "Add section" in the Builder sidebar.
 * Returns immediately after clicking; caller waits for the new section.
 */
export async function clickAddSection(page: Page): Promise<void> {
  await page
    .locator('[data-testid="add-section"], [aria-label*="Add section"], button:has-text("Add section")')
    .first()
    .click({ timeout: 8_000 });
  await page.getByRole("button", { name: /^Text\b/ }).first().click({ timeout: 8_000 });
}

/**
 * Click a section's action menu item.
 * @param sectionLocator  - a Playwright locator scoped to the section element.
 * @param action          - one of 'move-up' | 'move-down' | 'duplicate' | 'delete'
 */
export async function sectionAction(
  page: Page,
  sectionLocator: import("playwright/test").Locator,
  action: "move-up" | "move-down" | "duplicate" | "delete",
): Promise<void> {
  // Select the intended root, rather than clicking a similarly named action
  // elsewhere on the page or accidentally selecting one of its child nodes.
  if (await sectionLocator.getAttribute("data-kcd-root-id")) {
    await sectionLocator.focus(); await sectionLocator.press("Enter");
  } else {
    await sectionLocator.click({ position: { x: 2, y: 2 } });
  }
  const inspector = page.getByRole("complementary", { name: "Section editor", exact: true });
  const name = { "move-up": /Move up/, "move-down": /Move down/, duplicate: /^Duplicate$/, delete: /^Remove$/ }[action];
  await inspector.getByRole("button", { name }).first().click();
  if (action === "delete") {
    const primitive = inspector.getByRole("button", { name: "Confirm remove", exact: true });
    const legacy = inspector.getByRole("group", { name: "Confirm remove section", exact: true });
    await expect.poll(async () => await primitive.isVisible() || await legacy.isVisible()).toBe(true);
    if (await primitive.isVisible()) await primitive.click();
    else await legacy.getByRole("button", { name: "Remove", exact: true }).click();
  }
}

// ── undo / redo ────────────────────────────────────────────────────────────

export async function undo(page: Page): Promise<void> {
  await page.keyboard.press("ControlOrMeta+Z");
}

export async function redo(page: Page): Promise<void> {
  await page.keyboard.press("ControlOrMeta+Shift+Z");
}

// ── page management ────────────────────────────────────────────────────────

export async function createPage(page: Page, title: string): Promise<void> {
  await page.getByRole("toolbar", { name: "Builder tools", exact: true }).getByRole("button", { name: "Pages", exact: true }).click();
  await page.getByRole("button", { name: "+ New page", exact: true }).click();
  await page.getByRole("textbox", { name: "New page title", exact: true }).fill(title);
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Section editor", exact: true }).getByRole("button", { name: title, exact: true })).toBeVisible();
}

export async function renamePage(page: Page, title: string, nextTitle: string): Promise<void> {
  const row = page.getByRole("complementary", { name: "Section editor", exact: true }).locator("li")
    .filter({ has: page.getByRole("button", { name: title, exact: true }) });
  await row.hover(); await row.getByRole("button", { name: "Rename page", exact: true }).click();
  await page.getByRole("textbox", { name: "Page title", exact: true }).fill(nextTitle);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Section editor", exact: true }).getByRole("button", { name: nextTitle, exact: true })).toBeVisible();
}

export async function deletePage(page: Page, title: string): Promise<void> {
  const pageItem = page.getByRole("complementary", { name: "Section editor", exact: true }).locator("li")
    .filter({ has: page.getByRole("button", { name: title, exact: true }) });
  await pageItem.hover();
  page.once("dialog", dialog => dialog.accept());
  await pageItem.getByRole("button", { name: "Delete page", exact: true }).click();
  await expect(pageItem).toHaveCount(0);
}

// ── publish ────────────────────────────────────────────────────────────────

export async function clickPublish(page: Page): Promise<void> {
  await page
    .locator('[data-testid="publish-btn"], button:has-text("Publish"), button:has-text("Republish")')
    .first()
    .click({ timeout: 8_000 });
}

export async function waitForPublishSuccess(page: Page, timeoutMs = 20_000): Promise<boolean> {
  try {
    await expect(page.getByRole("button", { name: "Published ✓", exact: true })).toBeVisible({ timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

// ── offline simulation ─────────────────────────────────────────────────────

export async function goOffline(context: BrowserContext): Promise<void> {
  await context.setOffline(true);
}

export async function goOnline(context: BrowserContext): Promise<void> {
  await context.setOffline(false);
}

// ── text editing ───────────────────────────────────────────────────────────

/**
 * Click into the first editable text field in the Builder and type `text`.
 * Replaces existing content.
 */
export async function editFirstText(page: Page, text: string): Promise<void> {
  await page.getByRole("region", { name: "Site canvas", exact: true }).getByRole("heading").first().click();
  await page.getByRole("textbox", { name: "Text", exact: true }).fill(text);
  await page.getByRole("combobox", { name: "Text style", exact: true }).focus();
  await expect(page.getByRole("region", { name: "Site canvas", exact: true }).getByRole("heading", { name: text, exact: true })).toBeVisible();
}
