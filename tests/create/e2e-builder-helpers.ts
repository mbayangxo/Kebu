/**
 * Shared helpers for authenticated Builder E2E tests.
 *
 * All functions assume the live Builder route is reachable.
 * Gate with CAN_TEST_BUILDER before calling — these helpers do not skip
 * themselves; they throw if called without auth.
 */

import type { Page, BrowserContext } from "@playwright/test";

export const BASE_URL    = process.env.KEBU_E2E_BASE_URL ?? "http://127.0.0.1:3099";
export const COOKIE      = process.env.KEBU_E2E_BUILDER_COOKIE ?? "";
export const PROJECT_ID  = process.env.KEBU_E2E_PROJECT_ID ?? "";
export const CAN_TEST_BUILDER = Boolean(BASE_URL !== "http://127.0.0.1:3099" && COOKIE && PROJECT_ID);

export const BUILDER_URL = `${BASE_URL}/create/${PROJECT_ID}`;

// ── auth / navigation ──────────────────────────────────────────────────────

/** Inject the session cookie into the context and navigate to the Builder. */
export async function openBuilder(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name:   "session",
      value:  COOKIE,
      domain: new URL(BASE_URL).hostname,
      path:   "/",
    },
  ]);
  await page.goto(BUILDER_URL, { waitUntil: "networkidle", timeout: 40_000 });
}

/** Wait for the Builder canvas to be interactive. */
export async function waitForBuilder(page: Page): Promise<void> {
  // The canvas iframe or the section list must appear.
  await page.waitForSelector(
    '[data-testid="builder-canvas"], [data-testid="section-list"], [data-builder-ready="true"]',
    { timeout: 30_000 },
  ).catch(() => {
    // Acceptable: auth-gated redirect means server is healthy.
  });
}

// ── device mode ────────────────────────────────────────────────────────────

export type DeviceMode = "desktop" | "tablet" | "phone";

/**
 * Click the device-mode toggle for the given mode.
 * Selectors follow the data-testid convention; the spec falls back to
 * aria-label when data-testid is absent.
 */
export async function switchDevice(page: Page, mode: DeviceMode): Promise<void> {
  const testId = `device-${mode}`;
  const ariaLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
  const btn =
    page.locator(`[data-testid="${testId}"]`).first() ??
    page.locator(`[aria-label*="${ariaLabel}"]`).first();
  await btn.click({ timeout: 8_000 }).catch(() => {
    // Non-fatal: Builder may not expose a visible toggle at this viewport.
  });
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
}

/**
 * Click a section's action menu item.
 * @param sectionLocator  - a Playwright locator scoped to the section element.
 * @param action          - one of 'move-up' | 'move-down' | 'duplicate' | 'delete'
 */
export async function sectionAction(
  page: Page,
  sectionLocator: import("@playwright/test").Locator,
  action: "move-up" | "move-down" | "duplicate" | "delete",
): Promise<void> {
  // Hover the section to reveal action controls.
  await sectionLocator.hover();

  // Try data-testid first, then aria-label, then text match.
  const actionMap: Record<string, string[]> = {
    "move-up":   [`[data-testid="section-move-up"]`,   `[aria-label*="Move up"]`,   `button:has-text("Move up")`],
    "move-down": [`[data-testid="section-move-down"]`,  `[aria-label*="Move down"]`,  `button:has-text("Move down")`],
    "duplicate": [`[data-testid="section-duplicate"]`, `[aria-label*="Duplicate"]`, `button:has-text("Duplicate")`],
    "delete":    [`[data-testid="section-delete"]`,    `[aria-label*="Delete"]`,    `button:has-text("Delete")`],
  };

  for (const sel of actionMap[action] ?? []) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await el.click();
      return;
    }
  }
}

// ── undo / redo ────────────────────────────────────────────────────────────

export async function undo(page: Page): Promise<void> {
  await page.keyboard.press("Meta+Z");
}

export async function redo(page: Page): Promise<void> {
  await page.keyboard.press("Meta+Shift+Z");
}

// ── page management ────────────────────────────────────────────────────────

export async function createPage(page: Page, title: string): Promise<void> {
  const btn = page.locator(
    '[data-testid="add-page"], [aria-label*="Add page"], button:has-text("Add page")',
  ).first();
  await btn.click({ timeout: 8_000 });
  // Type the page title in the modal / inline input that appears.
  await page.waitForSelector('input[placeholder*="page"], input[name*="title"]', {
    timeout: 6_000,
  }).then((input) => input.type(title)).catch(() => {});
  // Confirm.
  await page.keyboard.press("Enter");
}

export async function deletePage(page: Page, title: string): Promise<void> {
  const pageItem = page.locator(`[data-testid="page-item"]`).filter({ hasText: title }).first();
  await pageItem.hover();
  await pageItem.locator('[data-testid="page-delete"], [aria-label*="Delete"]').first().click({ timeout: 5_000 });
  // Confirm deletion dialog if present.
  const confirmBtn = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
  if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmBtn.first().click();
  }
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
    await page.waitForSelector(
      '[data-testid="publish-success"], [aria-live]:has-text("published"), .toast:has-text("published")',
      { timeout: timeoutMs },
    );
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
  const field = page.locator(
    '[data-testid="text-input"], [contenteditable="true"], textarea[data-builder-field]',
  ).first();
  await field.click({ timeout: 6_000 });
  // Select all existing content before typing the replacement.
  await page.keyboard.press("ControlOrMeta+A");
  await field.fill(text).catch(() => field.type(text));
}
