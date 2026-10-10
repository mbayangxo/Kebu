/**
 * Phase 3B Gate 2 — authenticated Builder E2E (forensic).
 *
 * Drives the real Builder UI in a real browser against a LOCAL app backed by
 * the QA Supabase project. Every UI observation is cross-checked against
 * persisted QA state. Selectors are strict: a control that does not resolve
 * fails the test.
 *
 * Two kinds of checks:
 *   • Hard assertions — behaviour 75c0343 implements and the flow depends on.
 *   • Contract probes — expected behaviour that source inspection flagged as
 *     at risk. Each probe records expected vs. actual into `findings`; the
 *     final test fails if any probe was violated, listing all of them, so no
 *     violation is hidden and later phases still execute.
 *
 * Device model at 75c0343:
 *   • Desktop order = project_sections.sort_order (canonical)
 *   • Tablet/Phone order = project_pages.device_layouts[device].sectionOrder (Phase 3B)
 *   • Per-device visibility = props._visibility.hideOn (Phase 3B)
 *   • Per-device content = props.deviceOverrides[device] + _state (pre-3B, 52362c6)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page, type BrowserContext, type Browser } from "playwright/test";
import {
  APP_URL,
  SECTION_SPECS,
  assertQaOnly,
  cleanupGate2,
  createIdentity,
  headingFor,
  readPersisted,
  seedProjectAsOwner,
  svc,
  type Identity,
  type PersistedState,
  type SectionKey,
  type SeededProject,
} from "./fixtures";

type Device = "Desktop" | "Tablet" | "Phone";

const OUT = process.env.GATE2_OUTPUT_DIR ?? "./.gate2-results";
const evidence: Record<string, unknown> = {};
const record = (key: string, value: unknown) => { evidence[key] = value; };

type Finding = { id: string; expectation: string; expected: unknown; actual: unknown };
const findings: Finding[] = [];
/** Contract probe: records a violation instead of aborting the serial flow. */
function probe(id: string, expectation: string, expected: unknown, actual: unknown) {
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  evidence.probes ??= [];
  (evidence.probes as Record<string, unknown>[]).push({ id, expectation, expected, actual, ok });
  if (!ok) findings.push({ id, expectation, expected, actual });
}

let owner: Identity;
let intruder: Identity;
let seedA: SeededProject;
let seedB: SeededProject;
let ctxA: BrowserContext;
let pageA: Page;
const clientErrorsA: string[] = [];

const ids = (seed: SeededProject, keys: SectionKey[]) => keys.map((k) => seed.sectionIds[k]);
const labelOf = (k: SectionKey) => SECTION_SPECS.find((s) => s.key === k)!.label;
const H = (k: SectionKey) => headingFor("G2-", k);
const TABLET_ONLY_CHARLIE = "G2-CHARLIE tablet-only copy";

async function shot(page: Page, name: string) {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
}

// ── UI primitives ────────────────────────────────────────────────────────────

async function signIn(page: Page, who: Identity, projectId: string) {
  await page.goto(`/login?next=${encodeURIComponent(`/create/${projectId}`)}`, { waitUntil: "networkidle" });
  // Controlled React form: values typed before hydration are reset, so re-verify before submitting.
  await expect(async () => {
    await page.locator('input[type="email"]').fill(who.email);
    await page.locator('input[type="password"]').fill(who.password);
    await expect(page.locator('input[type="email"]')).toHaveValue(who.email, { timeout: 1_000 });
    await expect(page.locator('input[type="password"]')).toHaveValue(who.password, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`**/create/${projectId}**`, { timeout: 90_000 });
}

const template = (page: Page) => page.locator('section[aria-label="Template"]');
const rowLabel = (page: Page, k: SectionKey) => template(page).getByRole("button", { name: labelOf(k), exact: true });

async function waitForBuilder(page: Page) {
  await expect(rowLabel(page, "alpha")).toBeVisible({ timeout: 90_000 });
  // The Yande speed-dial opens on every Builder load (useState(true)); its invisible
  // click-outside backdrop swallows the first workspace click. Dismiss it as a user
  // would, via its own "Close menu" control. (Recorded finding.)
  const closeDial = page.getByRole("button", { name: "Close menu", exact: true });
  if (await closeDial.isVisible()) {
    await closeDial.click();
    record("yandeDialOpenOnLoad", true);
  }
  await expect(page.getByRole("button", { name: "Open Yande", exact: true })).toBeVisible();
}

const deviceButton = (page: Page, d: Device) =>
  page.getByRole("group", { name: "Preview device" }).getByRole("button", { name: d, exact: true });

async function currentDevice(page: Page): Promise<Device> {
  for (const d of ["Desktop", "Tablet", "Phone"] as Device[]) {
    if ((await deviceButton(page, d).getAttribute("aria-pressed")) === "true") return d;
  }
  throw new Error("no device is pressed");
}

async function clickDevice(page: Page, device: Device) {
  await deviceButton(page, device).click();
  await expect(deviceButton(page, device)).toHaveAttribute("aria-pressed", "true");
}

/**
 * Switch device. A direct Tablet↔Phone switch leaves the preview iframe on the previous device
 * (the postMessage effect omits `device` from its deps — proven defect, see probeDirectSwitch),
 * so non-desktop→non-desktop switches hop through Desktop, which remounts the preview.
 * `direct: true` performs the raw switch for the probe.
 */
async function selectDevice(page: Page, device: Device, opts: { direct?: boolean } = {}) {
  const cur = await currentDevice(page);
  if (!opts.direct && cur !== device && cur !== "Desktop" && device !== "Desktop") await clickDevice(page, "Desktop");
  await clickDevice(page, device);
}

/** PROBE: a direct non-desktop→non-desktop switch must re-render the canvas for the new device. */
async function probeDirectSwitch(id: string, page: Page, seed: SeededProject, from: "Tablet" | "Phone", to: "Tablet" | "Phone", expectedCanvas: SectionKey[]) {
  expect(await currentDevice(page)).toBe(from);
  await selectDevice(page, to, { direct: true });
  await backToList(page);
  let actual: SectionKey[];
  try {
    await expect.poll(() => canvasOrder(page, seed, to), { timeout: 15_000 }).toEqual(expectedCanvas);
    actual = expectedCanvas;
  } catch {
    actual = await canvasOrder(page, seed, to);
  }
  await shot(page, id);
  probe(id, `Switching directly ${from} → ${to} must re-render the ${to} canvas`, expectedCanvas, actual);
  // Recover to a known-fresh canvas for the rest of the flow.
  await clickDevice(page, "Desktop");
  await clickDevice(page, to);
}

/** Open a section's inspector from the Template list. */
async function openSection(page: Page, k: SectionKey) {
  // The inspector replaces the list and stays open across device switches — return to the list first.
  await backToList(page);
  await rowLabel(page, k).click();
  await expect(page.getByRole("button", { name: "Back to sections list", exact: true })).toBeVisible();
}

async function backToList(page: Page) {
  const back = page.getByRole("button", { name: "Back to sections list", exact: true });
  if (await back.isVisible()) await back.click();
  await expect(template(page)).toBeVisible();
}

async function listOrder(page: Page): Promise<SectionKey[]> {
  const byLabel = new Map(SECTION_SPECS.map((s) => [s.label, s.key]));
  const texts = await template(page).getByRole("button").evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()));
  return texts.map((t) => byLabel.get(t)).filter((k): k is SectionKey => Boolean(k));
}

function canvasScope(page: Page, device: Device) {
  return device === "Desktop"
    ? page.locator("body")
    : page.frameLocator(`iframe[title="${device === "Tablet" ? "tablet" : "mobile"} preview"]`).locator("body");
}

async function canvasOrder(page: Page, seed: SeededProject, device: Device): Promise<SectionKey[]> {
  const idToKey = new Map(Object.entries(seed.sectionIds).map(([k, id]) => [id, k as SectionKey]));
  const found = await canvasScope(page, device).locator("[data-section-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section-id") ?? ""));
  return found.map((id) => idToKey.get(id)).filter((k): k is SectionKey => Boolean(k));
}

async function canvasSectionText(page: Page, seed: SeededProject, device: Device, k: SectionKey): Promise<string> {
  return (await canvasScope(page, device).locator(`[data-section-id="${seed.sectionIds[k]}"]`).innerText()).replace(/\s+/g, " ").trim();
}

/**
 * Hard: section-list order and canvas order of the sections expected to be visible.
 * Probe: sections expected hidden on this device (in `list`, absent from `canvas`) must not
 * render — recorded rather than aborting, because per-device visibility is dropped from the
 * canvas definition when site chrome is enabled (proven defect, lib/create/site-chrome.ts).
 */
async function expectComposition(page: Page, seed: SeededProject, device: Device, list: SectionKey[], canvas: SectionKey[], tag: string) {
  await backToList(page);
  await expect.poll(() => listOrder(page), { message: `${tag}: ${device} section-list order`, timeout: 30_000 }).toEqual(list);
  const hidden = list.filter((k) => !canvas.includes(k));
  await expect.poll(async () => (await canvasOrder(page, seed, device)).filter((k) => !hidden.includes(k)), { message: `${tag}: ${device} canvas order`, timeout: 60_000 }).toEqual(canvas);
  let renderedHidden: SectionKey[] = [];
  if (hidden.length) {
    try {
      await expect.poll(async () => (await canvasOrder(page, seed, device)).filter((k) => hidden.includes(k)), { timeout: 10_000 }).toEqual([]);
    } catch {
      renderedHidden = (await canvasOrder(page, seed, device)).filter((k) => hidden.includes(k));
    }
    probe(`${tag}.hidden-not-rendered`, `Sections hidden on ${device} must not render in the ${device} canvas`, [], renderedHidden);
  }
  record(tag, { device, list, canvasVisibleOrder: canvas, renderedHidden });
}

/** Device-scoped reorder through the inspector's "Move up (Tablet)" / "Move down (Phone)" controls. */
async function moveOnDevice(page: Page, seed: SeededProject, k: SectionKey, dir: "up" | "down", device: "Tablet" | "Phone") {
  await openSection(page, k);
  const patch = page.waitForResponse(
    (r) => r.url().endsWith(`/api/projects/${seed.projectId}/pages`) && r.request().method() === "PATCH",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: `${dir === "up" ? "↑ Move up" : "↓ Move down"} (${device})`, exact: true }).click();
  expect((await patch).status(), "device layout PATCH status").toBe(200);
}

/** Desktop reorder through the inspector's "Move up" / "Move down". */
async function moveOnDesktop(page: Page, seed: SeededProject, k: SectionKey, dir: "up" | "down") {
  await openSection(page, k);
  const req = page.waitForResponse(
    (r) => r.url().includes(`/api/projects/${seed.projectId}/sections`) && r.request().method() !== "GET",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: dir === "up" ? "↑ Move up" : "↓ Move down", exact: true }).click();
  expect((await req).ok(), "desktop reorder request").toBe(true);
}

function visibilityPanel(page: Page) {
  return page.locator("details").filter({ has: page.locator("summary", { hasText: "Layout & Visibility" }) }).filter({ visible: true });
}

async function openVisibility(page: Page, k: SectionKey) {
  await openSection(page, k);
  const panel = visibilityPanel(page);
  await expect(panel).toHaveCount(1);
  if ((await panel.getAttribute("open")) === null) await panel.locator("summary").click();
  await expect(panel).toHaveAttribute("open", "");
  return panel;
}

async function saveDraft(page: Page) {
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
}

async function waitSaved(seed: SeededProject, check: (s: PersistedState) => boolean, message: string) {
  await expect.poll(async () => check(await readPersisted(seed)), { timeout: 30_000, message }).toBe(true);
}

function layoutsAsKeys(seed: SeededProject, state: PersistedState) {
  const idToKey = new Map(Object.entries(seed.sectionIds).map(([k, id]) => [id, k]));
  const map = (arr?: string[]) => arr?.map((id) => idToKey.get(id) ?? `foreign:${id}`);
  return {
    desktop: map(state.desktopOrder),
    tablet: map(state.deviceLayouts?.tablet?.sectionOrder),
    mobile: map(state.deviceLayouts?.mobile?.sectionOrder),
  };
}

async function responsiveBadge(page: Page, device: "Tablet" | "Phone"): Promise<string | null> {
  const badge = page.getByText(new RegExp(`^${device}: (✦ Auto-designed|✦ Customized|⚠ Needs review)$`));
  return (await badge.count()) ? (await badge.first().innerText()).trim() : null;
}

// ── Live site (published runtime) ────────────────────────────────────────────

/**
 * `identifyBy` names the text that identifies a section on this viewport when a required
 * device content override replaces its Desktop heading (e.g. the Tablet-only FAQ copy).
 */
async function liveComposition(
  browser: Browser, seed: SeededProject, width: number, height: number, name: string,
  identifyBy: Partial<Record<SectionKey, string>> = {},
) {
  const ctx = await browser.newContext({ baseURL: APP_URL, viewport: { width, height } });
  const page = await ctx.newPage();
  const res = await page.goto(`/sites/${seed.subdomain}`, { waitUntil: "networkidle", timeout: 90_000 });
  const markers = SECTION_SPECS.map((s) => ({ key: s.key, text: identifyBy[s.key] ?? headingFor(seed.prefix, s.key) }));
  // Element-level match: headings may be split across several text nodes (e.g. per-word spans),
  // so match the deepest element whose full textContent contains the marker.
  const found = await page.evaluate((ms) => {
    const all = Array.from(document.body.querySelectorAll("*")).filter((el) => !el.closest("script, style, noscript, template"));
    const seen: { key: string; visible: boolean; text: string; el: Element }[] = [];
    for (const m of ms) {
      const hits = all.filter((el) => (el.textContent ?? "").includes(m.text));
      const deepest = hits.find((el) => !Array.from(el.children).some((c) => (c.textContent ?? "").includes(m.text)));
      if (!deepest) continue;
      const rect = deepest.getBoundingClientRect();
      seen.push({
        key: m.key,
        el: deepest,
        text: (deepest.textContent ?? "").replace(/\s+/g, " ").trim(),
        visible: deepest.checkVisibility({ checkVisibilityCSS: true }) && rect.height > 0 && rect.width > 0,
      });
    }
    seen.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    return seen.map(({ key, visible, text }) => ({ key, visible, text }));
  }, markers);
  const bodyText = await page.locator("body").innerText();
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
  await ctx.close();
  return {
    status: res?.status() ?? 0,
    visibleOrder: found.filter((f) => f.visible).map((f) => f.key as SectionKey),
    headings: Object.fromEntries(found.map((f) => [f.key, f.text])),
    showsTabletOnlyCharlie: bodyText.includes(TABLET_ONLY_CHARLIE),
  };
}

// ── Suite ────────────────────────────────────────────────────────────────────

test.describe.serial("Phase 3B Gate 2 — authenticated Builder E2E", () => {
  test.beforeAll(async ({ browser }) => {
    assertQaOnly();
    mkdirSync(OUT, { recursive: true });
    owner = await createIdentity("owner");
    intruder = await createIdentity("intruder");
    seedA = await seedProjectAsOwner(owner, "Gate2 A", "G2-");
    seedB = await seedProjectAsOwner(intruder, "Gate2 B", "G2B-");

    // User B's own Tablet override — must never surface in A's project and vice versa.
    const { error } = await intruder.client
      .from("project_pages")
      .update({ device_layouts: { tablet: { sectionOrder: ids(seedB, ["delta", "charlie", "bravo", "alpha"]) } } })
      .eq("id", seedB.pageId);
    if (error) throw new Error(`seed B device layout failed: ${error.message}`);

    record("synthetic", {
      owner: owner.userId, intruder: intruder.userId,
      projectA: { id: seedA.projectId, pageId: seedA.pageId, subdomain: seedA.subdomain, sectionIds: seedA.sectionIds },
      projectB: { id: seedB.projectId, pageId: seedB.pageId, subdomain: seedB.subdomain },
    });

    ctxA = await browser.newContext({ baseURL: APP_URL });
    pageA = await ctxA.newPage();
    pageA.on("pageerror", (e) => clientErrorsA.push(`pageerror: ${e.message}`));
    pageA.on("console", (m) => { if (m.type() === "error") clientErrorsA.push(`console: ${m.text().slice(0, 300)}`); });
  });

  test.afterAll(async () => {
    record("clientErrorsA", clientErrorsA);
    record("findings", findings);
    await ctxA?.close().catch(() => {});
    const cleanup = await cleanupGate2();
    const db = svc();
    const residue: Record<string, number> = {};
    for (const table of ["projects", "project_pages", "deployments", "site_subscriptions", "website_versions", "site_analytics_events"]) {
      const col = table === "projects" ? "id" : "project_id";
      const { count, error } = await db.from(table).select("*", { count: "exact", head: true }).in(col, cleanup.projects);
      residue[table] = error ? -1 : count ?? -1;
    }
    const { count: sectionResidue } = await db.from("project_sections").select("*", { count: "exact", head: true })
      .in("id", [...Object.values(seedA?.sectionIds ?? {}), ...Object.values(seedB?.sectionIds ?? {})]);
    residue.project_sections = sectionResidue ?? -1;
    const remainingUsers: string[] = [];
    for (const id of cleanup.users) {
      const { data } = await db.auth.admin.getUserById(id);
      if (data?.user) remainingUsers.push(id);
    }
    record("cleanup", { ...cleanup, residue, remainingUsers });
    writeFileSync(join(OUT, "gate2-evidence.json"), JSON.stringify(evidence, null, 2));
    if (cleanup.errors.length || remainingUsers.length || Object.values(residue).some((n) => n !== 0)) {
      throw new Error(`Gate 2 cleanup incomplete: ${JSON.stringify({ errors: cleanup.errors, residue, remainingUsers })}`);
    }
  });

  test("A. authenticated owner enters Builder on the correct project", async () => {
    const projectLoad = pageA.waitForResponse((r) => r.url().endsWith(`/api/projects/${seedA.projectId}`) && r.request().method() === "GET", { timeout: 90_000 });
    await signIn(pageA, owner, seedA.projectId);
    expect((await projectLoad).status()).toBe(200);
    await waitForBuilder(pageA);
    await expect(pageA.getByRole("group", { name: "Preview device" }).getByRole("button", { name: "Desktop", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expectComposition(pageA, seedA, "Desktop", ["alpha", "bravo", "charlie", "delta"], ["alpha", "bravo", "charlie", "delta"], "A.entry");
    for (const k of SECTION_SPECS.map((s) => s.key)) await expect(pageA.getByText(H(k)).first()).toBeVisible();
    expect(await pageA.content(), "no user-B data in A's Builder").not.toContain("G2B-");
    await shot(pageA, "A-entry-desktop");
  });

  test("B. device presentation — inheritance and repeated switching", async () => {
    const base: SectionKey[] = ["alpha", "bravo", "charlie", "delta"];
    for (let cycle = 1; cycle <= 3; cycle++) {
      for (const device of ["Tablet", "Phone", "Desktop"] as Device[]) {
        await selectDevice(pageA, device);
        await expectComposition(pageA, seedA, device, base, base, `B.cycle${cycle}.${device}`);
        if (cycle === 1) await shot(pageA, `B-inherited-${device.toLowerCase()}`);
      }
    }
    // Generated presentation: untouched sections report "Auto-designed" on Tablet and Phone.
    await selectDevice(pageA, "Tablet");
    await openSection(pageA, "charlie");
    expect(await responsiveBadge(pageA, "Tablet")).toBe("Tablet: ✦ Auto-designed");
    await selectDevice(pageA, "Phone");
    expect(await responsiveBadge(pageA, "Phone")).toBe("Phone: ✦ Auto-designed");
    await backToList(pageA);
    await selectDevice(pageA, "Desktop");

    const state = await readPersisted(seedA);
    record("B.persisted", layoutsAsKeys(seedA, state));
    expect(state.deviceLayouts, "switching devices must not write device layouts").toBeNull();
    expect(state.desktopOrder).toEqual(ids(seedA, base));
  });

  test("C. manual Tablet and Phone overrides are independent and leave Desktop intact", async () => {
    // Tablet: FAQ up
    await selectDevice(pageA, "Tablet");
    await moveOnDevice(pageA, seedA, "charlie", "up", "Tablet");
    await expectComposition(pageA, seedA, "Tablet", ["alpha", "charlie", "bravo", "delta"], ["alpha", "charlie", "bravo", "delta"], "C.tablet-override");
    let state = await readPersisted(seedA);
    expect(state.deviceLayouts?.tablet?.sectionOrder).toEqual(ids(seedA, ["alpha", "charlie", "bravo", "delta"]));
    expect(state.deviceLayouts?.mobile, "Tablet change must not create a Phone override").toBeUndefined();
    expect(state.desktopOrder, "Tablet change must not modify Desktop").toEqual(ids(seedA, ["alpha", "bravo", "charlie", "delta"]));
    await shot(pageA, "C-tablet-override");

    // Phone inherits Desktop (Tablet override must not leak), then Hero down.
    await probeDirectSwitch("C.direct-tablet-to-phone-canvas", pageA, seedA, "Tablet", "Phone", ["alpha", "bravo", "charlie", "delta"]);
    await expectComposition(pageA, seedA, "Phone", ["alpha", "bravo", "charlie", "delta"], ["alpha", "bravo", "charlie", "delta"], "C.phone-inherits-before-override");
    await moveOnDevice(pageA, seedA, "alpha", "down", "Phone");
    await expectComposition(pageA, seedA, "Phone", ["bravo", "alpha", "charlie", "delta"], ["bravo", "alpha", "charlie", "delta"], "C.phone-override");
    state = await readPersisted(seedA);
    expect(state.deviceLayouts?.mobile?.sectionOrder).toEqual(ids(seedA, ["bravo", "alpha", "charlie", "delta"]));
    expect(state.deviceLayouts?.tablet?.sectionOrder, "Phone change must not overwrite Tablet").toEqual(ids(seedA, ["alpha", "charlie", "bravo", "delta"]));
    expect(state.desktopOrder).toEqual(ids(seedA, ["alpha", "bravo", "charlie", "delta"]));

    // Phone-only visibility: hide Features on Phone.
    const panel = await openVisibility(pageA, "delta");
    await panel.getByRole("checkbox", { name: "Phone", exact: true }).setChecked(false);
    await saveDraft(pageA);
    await waitSaved(seedA, (s) => JSON.stringify(s.props[seedA.sectionIds.delta]?._visibility) === JSON.stringify({ hideOn: ["mobile"] }), "delta _visibility persisted");
    await expectComposition(pageA, seedA, "Phone", ["bravo", "alpha", "charlie", "delta"], ["bravo", "alpha", "charlie"], "C.phone-hidden-features");
    await shot(pageA, "C-phone-override-hidden");

    await probeDirectSwitch("C.direct-phone-to-tablet-canvas", pageA, seedA, "Phone", "Tablet", ["alpha", "charlie", "bravo", "delta"]);
    await expectComposition(pageA, seedA, "Tablet", ["alpha", "charlie", "bravo", "delta"], ["alpha", "charlie", "bravo", "delta"], "C.tablet-unaffected-by-phone");
    await selectDevice(pageA, "Desktop");
    await expectComposition(pageA, seedA, "Desktop", ["alpha", "bravo", "charlie", "delta"], ["alpha", "bravo", "charlie", "delta"], "C.desktop-unaffected");

    state = await readPersisted(seedA);
    record("C.persisted", layoutsAsKeys(seedA, state));
    for (const k of ["alpha", "bravo", "charlie"] as SectionKey[]) {
      expect(state.props[seedA.sectionIds[k]]._visibility, `${k} visibility untouched`).toBeUndefined();
      expect(state.props[seedA.sectionIds[k]].heading).toBe(H(k));
    }

    // PROBE C4 — inspector content edit while Tablet is the active device.
    // Contract (lib/create/device-overrides.ts applyDeviceAwarePatch): "Desktop writes base
    // props; tablet/mobile write deviceOverrides only."
    await selectDevice(pageA, "Tablet");
    await openSection(pageA, "alpha");
    const tabletEdit = `${H("alpha")} tablet-sidebar-edit`;
    await pageA.getByRole("textbox", { name: "Hero heading", exact: true }).fill(tabletEdit);
    await saveDraft(pageA);
    await waitSaved(seedA, (s) => {
      const p = s.props[seedA.sectionIds.alpha];
      return p.heading === tabletEdit || JSON.stringify(p.deviceOverrides ?? {}).includes("tablet-sidebar-edit");
    }, "tablet-mode hero edit persisted somewhere");
    state = await readPersisted(seedA);
    const alphaProps = state.props[seedA.sectionIds.alpha];
    record("C4.alphaAfterTabletSidebarEdit", { heading: alphaProps.heading, deviceOverrides: alphaProps.deviceOverrides ?? null });
    probe("C4.inspector-edit-in-tablet-mode-scoped-to-tablet",
      "Editing Hero heading in the inspector while Tablet is active must not change the Desktop (base) heading",
      H("alpha"), alphaProps.heading);
    await selectDevice(pageA, "Desktop");
    await backToList(pageA);
    const desktopAlphaText = await canvasSectionText(pageA, seedA, "Desktop", "alpha");
    record("C4.desktopCanvasAlpha", desktopAlphaText);
    // Restore the Desktop heading through the Desktop inspector so later phases start from a known base.
    await openSection(pageA, "alpha");
    await pageA.getByRole("textbox", { name: "Hero heading", exact: true }).fill(H("alpha"));
    await saveDraft(pageA);
    await waitSaved(seedA, (s) => s.props[seedA.sectionIds.alpha].heading === H("alpha"), "alpha heading restored");
    // With C4 correct, the Tablet edit above is a Tablet override, which the Desktop re-type
    // does not undo. Return alpha to inheriting Desktop through the product's own
    // "Reset to Auto", so later phases start from a known base.
    await selectDevice(pageA, "Tablet");
    await openSection(pageA, "alpha");
    await pageA.getByRole("button", { name: "Reset to Auto", exact: true }).click();
    await pageA.getByRole("group", { name: "Confirm reset to auto" })
      .getByRole("button", { name: "Reset", exact: true }).click();
    await waitSaved(seedA, (s) => !s.props[seedA.sectionIds.alpha].deviceOverrides, "alpha Tablet override cleared");
    expect(await responsiveBadge(pageA, "Tablet")).toBe("Tablet: ✦ Auto-designed");
    await selectDevice(pageA, "Desktop");
    await backToList(pageA);
  });

  test("D. save + reload preserves Desktop, Tablet and Phone composition", async () => {
    await saveDraft(pageA);
    await pageA.reload({ waitUntil: "networkidle" });
    await waitForBuilder(pageA);
    await expectComposition(pageA, seedA, "Desktop", ["alpha", "bravo", "charlie", "delta"], ["alpha", "bravo", "charlie", "delta"], "D.reload-desktop");
    await selectDevice(pageA, "Tablet");
    await expectComposition(pageA, seedA, "Tablet", ["alpha", "charlie", "bravo", "delta"], ["alpha", "charlie", "bravo", "delta"], "D.reload-tablet");
    await selectDevice(pageA, "Phone");
    await expectComposition(pageA, seedA, "Phone", ["bravo", "alpha", "charlie", "delta"], ["bravo", "alpha", "charlie"], "D.reload-phone");
    await shot(pageA, "D-reload-phone");
    // Inspector reflects the persisted per-device visibility after reload.
    const panel = await openVisibility(pageA, "delta");
    await expect(panel.getByRole("checkbox", { name: "Phone", exact: true })).not.toBeChecked();
    await expect(panel.getByRole("checkbox", { name: "Tablet", exact: true })).toBeChecked();
    await expect(panel.getByRole("checkbox", { name: "Desktop", exact: true })).toBeChecked();
    await backToList(pageA);
    await selectDevice(pageA, "Desktop");
  });

  test("E. Desktop changes after device customization preserve manual overrides", async () => {
    test.setTimeout(360_000); // several reloads + remote QA round-trips
    // E1 — Desktop reorder: Features up → Desktop [alpha, bravo, delta, charlie].
    await moveOnDesktop(pageA, seedA, "delta", "up");
    await waitSaved(seedA, (s) => JSON.stringify(s.desktopOrder) === JSON.stringify(ids(seedA, ["alpha", "bravo", "delta", "charlie"])), "desktop order persisted");
    await expectComposition(pageA, seedA, "Desktop", ["alpha", "bravo", "delta", "charlie"], ["alpha", "bravo", "delta", "charlie"], "E.desktop-reordered");

    // E2 — Desktop content edit is inherited by Tablet/Phone (content is shared).
    await openSection(pageA, "alpha");
    await pageA.getByRole("textbox", { name: "Hero heading", exact: true }).fill(`${H("alpha")} EDITED`);
    await saveDraft(pageA);
    await waitSaved(seedA, (s) => s.props[seedA.sectionIds.alpha]?.heading === `${H("alpha")} EDITED`, "desktop hero edit persisted");
    let state = await readPersisted(seedA);
    record("E.persisted", layoutsAsKeys(seedA, state));
    expect(state.deviceLayouts?.tablet?.sectionOrder, "Tablet override preserved after Desktop change").toEqual(ids(seedA, ["alpha", "charlie", "bravo", "delta"]));
    expect(state.deviceLayouts?.mobile?.sectionOrder, "Phone override preserved after Desktop change").toEqual(ids(seedA, ["bravo", "alpha", "charlie", "delta"]));
    expect(state.props[seedA.sectionIds.delta]._visibility).toEqual({ hideOn: ["mobile"] });

    await selectDevice(pageA, "Tablet");
    await expectComposition(pageA, seedA, "Tablet", ["alpha", "charlie", "bravo", "delta"], ["alpha", "charlie", "bravo", "delta"], "E.tablet-preserved");
    await expect(canvasScope(pageA, "Tablet").getByText(`${H("alpha")} EDITED`)).toBeVisible();
    await selectDevice(pageA, "Phone");
    await expectComposition(pageA, seedA, "Phone", ["bravo", "alpha", "charlie", "delta"], ["bravo", "alpha", "charlie"], "E.phone-preserved");
    await expect(canvasScope(pageA, "Phone").getByText(`${H("alpha")} EDITED`)).toBeVisible();
    await shot(pageA, "E-phone-after-desktop-change");

    // E3 — Responsive state machine (auto → custom → needs-review) on FAQ (composable).
    await selectDevice(pageA, "Tablet");
    await openSection(pageA, "charlie");
    expect(await responsiveBadge(pageA, "Tablet")).toBe("Tablet: ✦ Auto-designed");
    const customizeSave = pageA.waitForResponse((r) => r.url().includes(`/api/projects/${seedA.projectId}/sections`) && r.request().method() === "PATCH", { timeout: 30_000 });
    await pageA.getByRole("button", { name: "Customize", exact: true }).click();
    const customizeRes = await customizeSave;
    const customizeReq = customizeRes.request().postDataJSON() as { props?: { deviceOverrides?: unknown } };
    state = await readPersisted(seedA);
    record("E3.customize", {
      responseStatus: customizeRes.status(),
      sentDeviceOverrides: customizeReq?.props?.deviceOverrides ?? null,
      persistedDeviceOverrides: state.props[seedA.sectionIds.charlie].deviceOverrides ?? null,
      badgeAfterClick: await responsiveBadge(pageA, "Tablet"),
    });
    probe("E3.customize-state-persists",
      "Clicking Customize must persist the responsive state (deviceOverrides._state.mode = 'custom')",
      "custom",
      ((state.props[seedA.sectionIds.charlie].deviceOverrides as { _state?: { mode?: string } } | undefined)?._state?.mode) ?? null);

    // No reachable UI writes per-device content (Tablet/Phone canvas is a read-only preview iframe and
    // the device-aware fullscreen editor is never opened: setPreviewFullscreen(true) has no caller).
    // Seed the exact Tablet override applyDeviceAwarePatch would write, through the owner's own
    // same-origin API session, to exercise rendering + stale detection. (Seeded — recorded as such.)
    const charlieProps = state.props[seedA.sectionIds.charlie];
    const existing = (charlieProps.deviceOverrides ?? {}) as Record<string, unknown>;
    const seedOverride = await pageA.request.patch(`/api/projects/${seedA.projectId}/sections`, {
      headers: { Origin: APP_URL, "Content-Type": "application/json" },
      data: { sectionId: seedA.sectionIds.charlie, props: { deviceOverrides: { ...existing, tablet: { heading: TABLET_ONLY_CHARLIE } } } },
    });
    expect(seedOverride.status(), "owner API accepted Tablet override").toBe(200);
    state = await readPersisted(seedA);
    record("E3.seededOverridePersisted", state.props[seedA.sectionIds.charlie].deviceOverrides ?? null);

    await pageA.reload({ waitUntil: "networkidle" });
    await waitForBuilder(pageA);
    await selectDevice(pageA, "Tablet");
    await expect.poll(() => canvasSectionText(pageA, seedA, "Tablet", "charlie"), { timeout: 60_000 }).toContain(TABLET_ONLY_CHARLIE);
    await openSection(pageA, "charlie");
    expect(await responsiveBadge(pageA, "Tablet")).toBe("Tablet: ✦ Customized");
    await selectDevice(pageA, "Desktop");
    await backToList(pageA);
    expect(await canvasSectionText(pageA, seedA, "Desktop", "charlie"), "Desktop keeps base FAQ heading").toContain(H("charlie"));
    await selectDevice(pageA, "Phone");
    await backToList(pageA);
    expect(await canvasSectionText(pageA, seedA, "Phone", "charlie"), "Phone inherits base FAQ heading").toContain(H("charlie"));

    // Desktop edit of the same section after Tablet customization.
    await selectDevice(pageA, "Desktop");
    await openSection(pageA, "charlie");
    await pageA.getByRole("textbox", { name: "FAQ heading", exact: true }).fill(`${H("charlie")} desktop-v2`);
    await saveDraft(pageA);
    await waitSaved(seedA, (s) => s.props[seedA.sectionIds.charlie]?.heading === `${H("charlie")} desktop-v2`, "desktop FAQ edit persisted");
    state = await readPersisted(seedA);
    const tabletOverride = (state.props[seedA.sectionIds.charlie].deviceOverrides as { tablet?: { heading?: string } } | undefined)?.tablet?.heading ?? null;
    expect(tabletOverride, "manual Tablet copy survives a later Desktop edit").toBe(TABLET_ONLY_CHARLIE);
    await selectDevice(pageA, "Tablet");
    await expect.poll(() => canvasSectionText(pageA, seedA, "Tablet", "charlie"), { timeout: 60_000 }).toContain(TABLET_ONLY_CHARLIE);
    await openSection(pageA, "charlie");
    const badgeAfterDesktopEdit = await responsiveBadge(pageA, "Tablet");
    record("E3.badgeAfterDesktopEdit", badgeAfterDesktopEdit);
    probe("E3.needs-review-after-desktop-edit",
      "After Desktop base props change, a customized Tablet section must surface '⚠ Needs review'",
      "Tablet: ⚠ Needs review", badgeAfterDesktopEdit);
    await shot(pageA, "E3-tablet-after-desktop-edit");
    await pageA.reload({ waitUntil: "networkidle" });
    await waitForBuilder(pageA);
    await selectDevice(pageA, "Tablet");
    await openSection(pageA, "charlie");
    const badgeAfterReload = await responsiveBadge(pageA, "Tablet");
    record("E3.badgeAfterReload", badgeAfterReload);
    probe("E3.needs-review-survives-reload",
      "'Needs review' must survive save + reload",
      "Tablet: ⚠ Needs review", badgeAfterReload);
    await backToList(pageA);
    await selectDevice(pageA, "Desktop");
  });

  test("F. second user cannot read, mutate or publish the owner's project", async ({ browser }) => {
    const before = await readPersisted(seedA);
    const ctxB = await browser.newContext({ baseURL: APP_URL });
    const pageB = await ctxB.newPage();
    try {
      await signIn(pageB, intruder, seedB.projectId);
      await waitForBuilder(pageB);
      expect(await pageB.content(), "no user-A data in B's Builder").not.toContain("G2-ALPHA");
      await selectDevice(pageB, "Tablet");
      await expectComposition(pageB, seedB, "Tablet", ["delta", "charlie", "bravo", "alpha"], ["delta", "charlie", "bravo", "alpha"], "F.intruder-own-tablet");

      const apiA = pageB.waitForResponse((r) => r.url().endsWith(`/api/projects/${seedA.projectId}`) && r.request().method() === "GET", { timeout: 90_000 });
      await pageB.goto(`/create/${seedA.projectId}`, { waitUntil: "domcontentloaded" });
      const apiRes = await apiA;
      const apiBody = await apiRes.text();
      // User-facing denial must be shown (not a blank or half-loaded editor).
      await expect(pageB.getByText("Project not found — or you do not have access.").first()).toBeVisible({ timeout: 60_000 });
      await pageB.waitForTimeout(3_000);
      await shot(pageB, "F-intruder-direct-navigation");
      const html = await pageB.content();
      record("F.directNavigation", { apiStatus: apiRes.status(), url: pageB.url(), leakedMarker: /G2-(ALPHA|BRAVO|CHARLIE|DELTA)/.test(html) || apiBody.includes("G2-") });
      expect([401, 403, 404]).toContain(apiRes.status());
      expect(apiBody).not.toContain("G2-");
      expect(html).not.toMatch(/G2-(ALPHA|BRAVO|CHARLIE|DELTA)/);
      expect(html).not.toContain(seedA.sectionIds.alpha);

      const headers = { Origin: APP_URL, "Content-Type": "application/json" };
      const attempts = {
        deviceLayouts: await pageB.request.patch(`/api/projects/${seedA.projectId}/pages`, { headers, data: { pageId: seedA.pageId, deviceLayouts: { tablet: { sectionOrder: ids(seedA, ["delta", "charlie", "bravo", "alpha"]) } } } }),
        clearLayouts: await pageB.request.patch(`/api/projects/${seedA.projectId}/pages`, { headers, data: { pageId: seedA.pageId, deviceLayouts: null } }),
        sectionProps: await pageB.request.patch(`/api/projects/${seedA.projectId}/sections`, { headers, data: { sectionId: seedA.sectionIds.alpha, props: { heading: "HIJACKED" } } }),
        publish: await pageB.request.post(`/api/projects/${seedA.projectId}/publish`, { headers, data: {} }),
        foreignPageViaOwnProject: await pageB.request.patch(`/api/projects/${seedB.projectId}/pages`, { headers, data: { pageId: seedA.pageId, deviceLayouts: null } }),
        foreignSectionViaOwnProject: await pageB.request.patch(`/api/projects/${seedB.projectId}/sections`, { headers, data: { sectionId: seedA.sectionIds.alpha, props: { heading: "HIJACKED" } } }),
      };
      const statuses = Object.fromEntries(Object.entries(attempts).map(([k, r]) => [k, r.status()]));
      record("F.mutationStatuses", statuses);
      for (const [k, s] of Object.entries(statuses)) expect([401, 403, 404], `mutation ${k}`).toContain(s);

      const { data: readRows } = await intruder.client.from("project_pages").select("id, device_layouts").eq("id", seedA.pageId);
      const { data: writeRows } = await intruder.client.from("project_pages").update({ device_layouts: null }).eq("id", seedA.pageId).select("id");
      record("F.rls", { readRows: readRows?.length ?? 0, writeRows: writeRows?.length ?? 0 });
      expect(readRows ?? []).toHaveLength(0);
      expect(writeRows ?? []).toHaveLength(0);

      const after = await readPersisted(seedA);
      expect(after.deviceLayouts).toEqual(before.deviceLayouts);
      expect(after.desktopOrder).toEqual(before.desktopOrder);
      expect(after.props).toEqual(before.props);
      expect(after.project.status).toBe(before.project.status);
      const { count: deploymentsA } = await svc().from("deployments").select("*", { count: "exact", head: true }).eq("project_id", seedA.projectId);
      expect(deploymentsA ?? 0, "intruder publish must not create a deployment").toBe(0);

      const bState = await readPersisted(seedB);
      expect(bState.deviceLayouts?.tablet?.sectionOrder).toEqual(ids(seedB, ["delta", "charlie", "bravo", "alpha"]));
    } finally {
      await ctxB.close();
    }
  });

  test("G. publish on local QA runtime — compare runtime output with persisted Builder state", async ({ browser }) => {
    const publish = pageA.waitForResponse((r) => r.url().endsWith(`/api/projects/${seedA.projectId}/publish`) && r.request().method() === "POST", { timeout: 90_000 });
    await pageA.getByRole("button", { name: /^(Publish|Republish)$/ }).click();
    const res = await publish;
    const body = await res.json().catch(() => ({}));
    record("G.publishResponse", { status: res.status(), body });
    expect(res.status(), `publish failed: ${JSON.stringify(body)}`).toBe(200);

    const state = await readPersisted(seedA);
    const { data: dep } = await svc().from("deployments").select("id, status, snapshot").eq("project_id", seedA.projectId).eq("status", "live").single();
    type SnapSection = { id?: string; visibility?: unknown; props?: Record<string, unknown> };
    const snapPage = (dep?.snapshot as { pages?: { slug: string; deviceLayouts?: unknown; sections: SnapSection[] }[] })?.pages?.find((p) => p.slug === "home");
    const snapCharlie = snapPage?.sections.find((s) => s.id === seedA.sectionIds.charlie);
    record("G.snapshot", {
      deviceLayoutsMatchDb: JSON.stringify(snapPage?.deviceLayouts) === JSON.stringify(state.deviceLayouts),
      snapshotSectionOrder: snapPage?.sections.map((s) => Object.entries(seedA.sectionIds).find(([, id]) => id === s.id)?.[0]),
      deltaVisibility: snapPage?.sections.find((s) => s.id === seedA.sectionIds.delta)?.visibility ?? null,
      charlieTabletOverride: (snapCharlie?.props?.deviceOverrides as { tablet?: unknown } | undefined)?.tablet ?? null,
    });
    expect(snapPage?.deviceLayouts, "published snapshot carries device layouts").toEqual(state.deviceLayouts);

    const desktop = await liveComposition(browser, seedA, 1440, 900, "G-live-desktop-1440");
    // On Tablet the FAQ heading is (required to be) the Tablet-only copy — identify it by that.
    const tablet = await liveComposition(browser, seedA, 768, 1024, "G-live-tablet-768", { charlie: TABLET_ONLY_CHARLIE });
    const phone = await liveComposition(browser, seedA, 390, 844, "G-live-phone-390");
    record("G.live", { desktop, tablet, phone });
    expect(desktop.status).toBe(200);
    expect(tablet.status).toBe(200);
    expect(phone.status).toBe(200);
    probe("G.live-desktop-order", "Live Desktop (1440px) renders the Desktop order", ["alpha", "bravo", "delta", "charlie"], desktop.visibleOrder);
    probe("G.live-tablet-order", "Live Tablet (768px) renders the manual Tablet order", ["alpha", "charlie", "bravo", "delta"], tablet.visibleOrder);
    probe("G.live-phone-order", "Live Phone (390px) renders the manual Phone order with Features hidden", ["bravo", "alpha", "charlie"], phone.visibleOrder);
    probe("G.live-tablet-copy", "Live Tablet renders the Tablet-only FAQ copy", true, tablet.showsTabletOnlyCharlie);
    probe("G.live-desktop-copy", "Live Desktop does not render the Tablet-only FAQ copy", false, desktop.showsTabletOnlyCharlie);
  });

  test("Z. Phase 3B contract probes — all satisfied", async () => {
    record("findings", findings);
    expect(findings, `Contract probe violations:\n${findings.map((f) => `• ${f.id}: ${f.expectation}\n    expected ${JSON.stringify(f.expected)}\n    actual   ${JSON.stringify(f.actual)}`).join("\n")}`).toEqual([]);
  });
});
