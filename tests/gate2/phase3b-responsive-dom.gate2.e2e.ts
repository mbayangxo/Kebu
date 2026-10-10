/**
 * Phase 3B — published responsive composition: DOM, accessibility, keyboard and focus order.
 *
 * A published page renders ONE representation of each section. After hydration the DOM is
 * composed for the viewport's device, so DOM, accessibility-tree, visual and Tab order all
 * follow that device's saved composition. Breakpoint transitions must keep focus (and typed
 * input) on the same element, in both directions. Without JavaScript the server render stays
 * coherent: one copy of everything, correct visual order and visibility via CSS.
 *
 * QA-only (tests/gate2/fixtures.ts guards); synthetic data is removed and verified in afterAll.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Browser, type Page } from "playwright/test";
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
const PREFIX = "G2D-";
type Slot = "header" | "alpha" | "bravo" | "charlie" | "delta" | "echo" | "footer";
type Device = "desktop" | "tablet" | "mobile";
const ECHO_HEADING = `${PREFIX}ECHO newsletter`;
const MARKERS: Record<Exclude<Slot, "header" | "footer">, string> = {
  alpha: headingFor(PREFIX, "alpha"),
  bravo: headingFor(PREFIX, "bravo"),
  charlie: headingFor(PREFIX, "charlie"),
  delta: headingFor(PREFIX, "delta"),
  echo: ECHO_HEADING,
};
const BODY: Record<Device, Slot[]> = {
  desktop: ["alpha", "bravo", "charlie", "delta", "echo"],
  tablet: ["echo", "alpha", "bravo", "charlie", "delta"],
  mobile: ["bravo", "echo", "alpha", "charlie", "delta"],
};
/** Visible composition: chrome header first, footer last; Features (delta) hidden on Phone. */
const visible = (d: Device): Slot[] => ["header", ...BODY[d].filter((s) => !(d === "mobile" && s === "delta")), "footer"];
const WIDTH: Record<Device, number> = { desktop: 1440, tablet: 768, mobile: 390 };

const evidence: Record<string, unknown> = {};
let owner: Identity;
let seed: SeededProject;
let echoId = "";

async function signIn(page: Page, who: Identity, projectId: string) {
  await page.goto(`/login?next=${encodeURIComponent(`/create/${projectId}`)}`, { waitUntil: "networkidle" });
  await expect(async () => {
    await page.locator('input[type="email"]').fill(who.email);
    await page.locator('input[type="password"]').fill(who.password);
    await expect(page.locator('input[type="email"]')).toHaveValue(who.email, { timeout: 1_000 });
    await expect(page.locator('input[type="password"]')).toHaveValue(who.password, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`**/create/${projectId}**`, { timeout: 90_000 });
}

/** Slot of every published render item, in DOM order (optionally visible ones only). */
async function domSlots(page: Page, visibleOnly: boolean): Promise<(Slot | null)[]> {
  return page.evaluate(({ markers, visibleOnly }) => {
    const identify = (el: Element): string | null => {
      const text = el.textContent ?? "";
      for (const [slot, marker] of Object.entries(markers)) if (text.includes(marker)) return slot;
      if (el.querySelector(".kebu-site-nav, nav")) return "header";
      if (el.querySelector("footer")) return "footer";
      return null;
    };
    const shown = (el: Element) => Array.from(el.children).some((c) => (c as HTMLElement).checkVisibility());
    return Array.from(document.querySelectorAll(".kebu-device-item"))
      .filter((el) => !visibleOnly || shown(el))
      .map(identify);
  }, { markers: MARKERS, visibleOnly }) as Promise<(Slot | null)[]>;
}

/** Visible items ordered by on-screen position (top edge). */
async function visualSlots(page: Page): Promise<(Slot | null)[]> {
  return page.evaluate((markers) => {
    const identify = (el: Element): string | null => {
      const text = el.textContent ?? "";
      for (const [slot, marker] of Object.entries(markers)) if (text.includes(marker)) return slot;
      if (el.querySelector(".kebu-site-nav, nav")) return "header";
      if (el.querySelector("footer")) return "footer";
      return null;
    };
    return Array.from(document.querySelectorAll(".kebu-device-item"))
      .map((el) => {
        const boxes = Array.from(el.children).filter((c) => (c as HTMLElement).checkVisibility()).map((c) => c.getBoundingClientRect().top);
        return { slot: identify(el), top: boxes.length ? Math.min(...boxes) : null };
      })
      .filter((x) => x.top !== null)
      .sort((a, b) => a.top! - b.top!)
      .map((x) => x.slot);
  }, MARKERS) as Promise<(Slot | null)[]>;
}

/** Marker headings in accessibility-tree order. */
async function a11yHeadingSlots(page: Page): Promise<Slot[]> {
  const snapshot = await page.locator("body").ariaSnapshot();
  const order: Slot[] = [];
  for (const line of snapshot.split("\n")) {
    if (!/heading\b/.test(line)) continue;
    for (const [slot, marker] of Object.entries(MARKERS)) if (line.includes(marker) && !order.includes(slot as Slot)) order.push(slot as Slot);
  }
  return order;
}

/** Sections reached by repeated Tab presses, in order (consecutive duplicates collapsed). */
async function tabSlots(page: Page, presses = 40): Promise<Slot[]> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const seen: Slot[] = [];
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press("Tab");
    const slot = await page.evaluate((markers) => {
      const item = document.activeElement?.closest(".kebu-device-item");
      if (!item) return null;
      const text = item.textContent ?? "";
      for (const [s, marker] of Object.entries(markers)) if (text.includes(marker)) return s;
      if (item.querySelector(".kebu-site-nav, nav")) return "header";
      if (item.querySelector("footer")) return "footer";
      return null;
    }, MARKERS);
    if (!slot || seen.at(-1) === slot) continue;
    if (seen.includes(slot as Slot)) break; // focus wrapped around the document
    seen.push(slot as Slot);
    if (slot === "footer") break;
  }
  return seen;
}

async function singleRepresentation(page: Page) {
  return page.evaluate((markers) => {
    // Rendered text only — the inline hydration payload (<script>) repeats page data.
    // No filter callback: page callbacks cannot run when JavaScript is disabled (no-JS check).
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const parts: string[] = [];
    while (walker.nextNode()) {
      if (!walker.currentNode.parentElement?.closest("script, style, template, noscript")) parts.push(walker.currentNode.textContent ?? "");
    }
    const text = parts.join("");
    const counts = Object.fromEntries(Object.entries(markers).map(([k, m]) => [k, text.split(m).length - 1]));
    const ids = Array.from(document.querySelectorAll("[id]")).map((el) => el.id);
    const duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    return { counts, duplicateIds, emailInputs: document.querySelectorAll('input[type="email"]').length };
  }, MARKERS);
}

async function openPublished(browser: Browser, device: Device, javaScriptEnabled = true) {
  const ctx = await browser.newContext({ baseURL: APP_URL, viewport: { width: WIDTH[device], height: 900 }, javaScriptEnabled });
  const page = await ctx.newPage();
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (/hydrat|did not match|server rendered|mismatch/i.test(m.text())) problems.push(`console ${m.type()}: ${m.text().slice(0, 300)}`);
  });
  const res = await page.goto(`/sites/${seed.subdomain}`, { waitUntil: "networkidle", timeout: 90_000 });
  expect(res?.status()).toBe(200);
  return { ctx, page, problems };
}

test.describe.serial("Phase 3B — published responsive DOM, accessibility and focus order", () => {
  test.beforeAll(async ({ browser }) => {
    assertQaOnly();
    mkdirSync(OUT, { recursive: true });
    owner = await createIdentity("domowner");
    seed = await seedProjectAsOwner(owner, "Gate2 DOM", PREFIX);

    const { data: echo, error: echoErr } = await owner.client
      .from("project_sections")
      .insert({ page_id: seed.pageId, section_type: "newsletter", sort_order: 4, props: { heading: ECHO_HEADING, subheading: "Gate 2 echo", buttonLabel: "Subscribe" } })
      .select("id")
      .single();
    if (echoErr || !echo) throw new Error(`seed echo failed: ${echoErr?.message}`);
    echoId = echo.id;
    const idOf = (s: Slot) => (s === "echo" ? echoId : seed.sectionIds[s as "alpha"]);
    // The hero gets a real call-to-action link, so a focusable control moves between devices.
    const { error: ctaErr } = await owner.client.from("project_sections")
      .update({ props: { heading: MARKERS.alpha, subheading: "Gate 2 alpha", buttonLabel: "Get started", buttonHref: "#newsletter" } })
      .eq("id", seed.sectionIds.alpha);
    if (ctaErr) throw new Error(`seed hero CTA failed: ${ctaErr.message}`);
    const { error: vErr } = await owner.client.from("project_sections")
      .update({ props: { heading: MARKERS.delta, items: [{ title: "Delta", body: "d" }], _visibility: { hideOn: ["mobile"] } } })
      .eq("id", seed.sectionIds.delta);
    if (vErr) throw new Error(`seed visibility failed: ${vErr.message}`);
    const { error: lErr } = await owner.client.from("project_pages")
      .update({ device_layouts: { tablet: { sectionOrder: BODY.tablet.map(idOf) }, mobile: { sectionOrder: BODY.mobile.map(idOf) } } })
      .eq("id", seed.pageId);
    if (lErr) throw new Error(`seed layouts failed: ${lErr.message}`);

    // Publish through the real application path as the owner.
    const ctx = await browser.newContext({ baseURL: APP_URL });
    const page = await ctx.newPage();
    await signIn(page, owner, seed.projectId);
    const res = await page.request.post(`/api/projects/${seed.projectId}/publish`, { headers: { Origin: APP_URL, "Content-Type": "application/json" }, data: {} });
    evidence.publish = { status: res.status() };
    expect(res.status(), await res.text()).toBe(200);
    await ctx.close();
  });

  test.afterAll(async () => {
    const cleanup = await cleanupGate2();
    const db = svc();
    const residue: Record<string, number> = {};
    for (const table of ["projects", "project_pages", "deployments", "site_subscriptions", "website_versions", "site_analytics_events"]) {
      const col = table === "projects" ? "id" : "project_id";
      const { count, error } = await db.from(table).select("*", { count: "exact", head: true }).in(col, cleanup.projects);
      residue[table] = error ? -1 : count ?? -1;
    }
    const remainingUsers: string[] = [];
    for (const id of cleanup.users) if ((await db.auth.admin.getUserById(id)).data?.user) remainingUsers.push(id);
    evidence.cleanup = { ...cleanup, residue, remainingUsers };
    writeFileSync(join(OUT, "responsive-dom-evidence.json"), JSON.stringify(evidence, null, 2));
    if (cleanup.errors.length || remainingUsers.length || Object.values(residue).some((n) => n !== 0)) {
      throw new Error(`cleanup incomplete: ${JSON.stringify(evidence.cleanup)}`);
    }
  });

  for (const device of ["desktop", "tablet", "mobile"] as Device[]) {
    test(`${device} (${WIDTH[device]}px): DOM, accessibility, visual and Tab order follow the ${device} composition`, async ({ browser }) => {
      const { ctx, page, problems } = await openPublished(browser, device);
      try {
        await expect.poll(() => domSlots(page, true), { message: "visible DOM order", timeout: 20_000 }).toEqual(visible(device));
        const allDom = await domSlots(page, false);
        const visual = await visualSlots(page);
        const a11y = await a11yHeadingSlots(page);
        const tab = await tabSlots(page);
        const single = await singleRepresentation(page);
        await page.screenshot({ path: join(OUT, `dom-${device}-${WIDTH[device]}.png`), fullPage: true });
        evidence[device] = { allDom, visual, a11y, tab, single, problems };

        expect(allDom, "DOM order incl. hidden").toEqual(["header", ...BODY[device], "footer"]);
        expect(visual, "visual order = DOM order").toEqual(visible(device));
        expect(a11y, "accessibility-tree heading order").toEqual(visible(device).filter((s) => s !== "header" && s !== "footer"));
        const positions = tab.map((s) => visible(device).indexOf(s));
        expect(positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1])), `Tab order ${JSON.stringify(tab)} follows ${JSON.stringify(visible(device))}`).toBe(true);
        expect(tab, "focusable sections reached by Tab").toEqual(expect.arrayContaining(["alpha", "echo"]));
        expect(Object.values(single.counts), "one copy of every section").toEqual([1, 1, 1, 1, 1]);
        expect(single.duplicateIds, "no duplicate element IDs").toEqual([]);
        expect(single.emailInputs, "one newsletter input").toBe(1);
        expect(problems, "no hydration errors").toEqual([]);
      } finally {
        await ctx.close();
      }
    });
  }

  test("breakpoint transitions in both directions keep focus and typed input on the same element", async ({ browser }) => {
    const { ctx, page, problems } = await openPublished(browser, "desktop");
    try {
      const input = page.locator('input[type="email"]');
      await input.click();
      await input.pressSequentially("focus@test.invalid");
      const handle = await input.elementHandle();
      const path: Device[] = ["mobile", "tablet", "desktop", "tablet", "mobile", "desktop"];
      const steps: unknown[] = [];
      for (const device of path) {
        await page.setViewportSize({ width: WIDTH[device], height: 900 });
        await expect.poll(() => domSlots(page, true), { message: `DOM order after switching to ${device}`, timeout: 20_000 }).toEqual(visible(device));
        const state = await handle!.evaluate((el) => ({
          connected: el.isConnected,
          focused: el === document.activeElement,
          value: (el as HTMLInputElement).value,
        }));
        steps.push({ device, ...state });
        expect(state, `after switching to ${device}`).toEqual({ connected: true, focused: true, value: "focus@test.invalid" });
      }
      evidence.transitions = { steps, problems };
      expect(problems, "no hydration/runtime errors across transitions").toEqual([]);
    } finally {
      await ctx.close();
    }
  });

  test("without JavaScript the server render is coherent: one copy, correct visual order and visibility", async ({ browser }) => {
    for (const device of ["mobile", "tablet"] as Device[]) {
      const { ctx, page } = await openPublished(browser, device, false);
      try {
        const single = await singleRepresentation(page);
        const visual = await visualSlots(page);
        const dom = await domSlots(page, false);
        await page.screenshot({ path: join(OUT, `nojs-${device}-${WIDTH[device]}.png`), fullPage: true });
        evidence[`nojs-${device}`] = { single, visual, dom };
        expect(Object.values(single.counts)).toEqual([1, 1, 1, 1, 1]);
        expect(single.duplicateIds).toEqual([]);
        expect(visual, "visual order via CSS").toEqual(visible(device));
        expect(dom, "server DOM is the Desktop composition").toEqual(["header", ...BODY.desktop, "footer"]);
      } finally {
        await ctx.close();
      }
    }
  });
});
