import { mkdirSync } from "node:fs";
import { test, expect } from "playwright/test";
import { openBuilderSqlBridge } from "./fixtures/builder-sql-bridge";
import { owner, projectId } from "./fixtures/3j-database";
import { defaultMaylecorKsendrProps } from "../../lib/create/maylecor-ksendr-defaults";
import { expectFor, type NodeId, type Op } from "../../lib/creative-core";
test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1" || !process.env.KEBU_LOCAL_PGLITE_ROOT, "Requires isolated migrated SQL authority");
const id = "66666666-6666-4666-8666-666666666666" as NodeId;
for (const [device, key, width] of [["Desktop", "desktop", 1440], ["Tablet", "tablet", 768], ["Phone", "mobile", 390]] as const) test(`${device} real social rail → link editing → atomic drag/cancel/history → SQL → reload → published icons`, async ({ page, browser }) => {
  test.setTimeout(120000); await page.setViewportSize({ width, height: 1000 });
  const authority = await openBuilderSqlBridge(page, async server => {
    const doc = server.current();
    const ops: Op[] = [{ op: "insertNode", node: { id, type: "legacy-section:legally-blonde-hero", typeVersion: 1, props: { ...defaultMaylecorKsendrProps(), showNavigation: false }, overrides: {} }, pageId: doc.pages[0]!.id, parentId: null, orderKey: "V" }];
    await server.apply({ txId: crypto.randomUUID(), origin: "user", label: "Social rail fixture", ops, expect: expectFor(doc, ops) });
  });
  const current = () => authority.server.current().nodes[id]!;
  const effective = () => ({ ...current().props, ...(key === "desktop" ? {} : current().overrides[key]) });
  const canvas = key === "desktop" ? page : page.frameLocator(`iframe[title="${key} preview"]`);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const selectDevice = async () => { if (key !== "desktop") await page.getByRole("button", { name: device, exact: true }).first().click(); };
  const close = async () => { const done = page.getByRole("button", { name: "Done — view site", exact: true }); if (await done.isVisible()) await done.click(); };
  try {
    await page.goto("/create/" + projectId); await close(); await selectDevice();
    const rail = canvas.getByRole("button", { name: "Edit social links", exact: true });
    await expect(rail).toBeVisible(); await expect(rail.locator("svg")).toHaveCount(6); await expect(rail.locator("img")).toHaveCount(0);
    await expect(rail).toContainText("Set links"); await rail.press("Enter");
    const url = page.getByRole("textbox", { name: "Social link 1 URL", exact: true });
    await expect(url).toHaveValue("");
    const label = page.getByRole("textbox", { name: "Social link 1 label", exact: true });
    await label.fill("Sound"); await label.pressSequentially("Cloud"); await expect(label).toHaveValue("SoundCloud"); await expect(label).toBeFocused();
    const count = authority.transactions.length;
    await url.fill("https://soundcloud.com/kebu-isolated-artist");
    await expect.poll(() => authority.transactions.length).toBe(count + 1);
    await expect.poll(() => (effective().socialLinks as Array<{href: string}>)[0]!.href).toBe("https://soundcloud.com/kebu-isolated-artist");
    await close(); await rail.focus();
    const box = (await rail.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2;
    const oldLeft = Number(effective().socialRailLeftPct), oldTop = Number(effective().socialRailTopPct), before = authority.transactions.length;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 36, y + 25, { steps: 8 });
    expect(authority.transactions).toHaveLength(before);
    await page.mouse.up(); await expect.poll(() => authority.transactions.length).toBe(before + 1);
    await expect.poll(() => Number(effective().socialRailLeftPct)).toBeGreaterThan(oldLeft);
    const moved = Number(effective().socialRailLeftPct);
    await expect(page.getByRole("button", { name: "Done — view site", exact: true })).toBeHidden();
    await page.getByRole("button", { name: "Undo", exact: true }).first().click();
    await expect.poll(() => effective().socialRailLeftPct).toBe(oldLeft); expect(effective().socialRailTopPct).toBe(oldTop);
    await page.getByRole("button", { name: "Redo", exact: true }).first().click(); await expect.poll(() => effective().socialRailLeftPct).toBe(moved);
    await rail.press("ArrowRight"); await expect.poll(() => Number(effective().socialRailLeftPct)).toBe(moved + 1);
    if (key === "mobile") {
      const cdp = await page.context().newCDPSession(page);
      try {
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
        const r = (await rail.boundingBox())!, x = r.x + r.width / 2, y = r.y + r.height / 2, before = authority.transactions.length;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 25, y: y + 15, id: 1 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
        await page.getByRole("button", { name: "Save draft", exact: true }).first().click();
        expect(authority.transactions).toHaveLength(before); expect(effective().socialRailLeftPct).toBe(moved + 1);
      } finally { await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false }); await cdp.detach(); }
    }
    await page.reload(); await close(); await selectDevice();
    await expect.poll(() => rail.evaluate(element => { const root = (element as HTMLElement).offsetParent as HTMLElement; return (element.getBoundingClientRect().left - root.getBoundingClientRect().left) / root.getBoundingClientRect().width * 100; })).toBeCloseTo(moved + 1, 1);
    const stored = (await authority.server.queryAs<{props: Record<string,unknown>}>("authenticated", owner, "select props from project_sections where id=$1", [id])).rows[0]!.props;
    const saved = key === "desktop" ? stored : (stored.deviceOverrides as Record<string,Record<string,unknown>>)[key]!;
    expect(saved.socialRailLeftPct).toBe(moved + 1);
    if (key !== "desktop") expect((current().props.socialLinks as Array<{href: string}>)[0]!.href).toBe("");
    mkdirSync("evidence/collage", { recursive: true }); await page.screenshot({ path: `evidence/collage/social-rail-${key}.png`, fullPage: true });
    await page.getByRole("button", { name: "Publish", exact: true }).first().click(); await expect(page.getByRole("button", { name: "Published ✓", exact: true })).toBeVisible();
    for (const javaScriptEnabled of [true, false]) {
      const context = await browser.newContext({ javaScriptEnabled, viewport: { width, height: 1000 } });
      try {
        const visitor = await context.newPage(); await visitor.goto("http://127.0.0.1:38415/s7-local-probe/home");
        await test.step(`Published ${key}, JavaScript ${javaScriptEnabled}`, async () => {
        const published = visitor.locator("[data-kebu-social-rail]:visible");
        await expect(published).toHaveCount(1); await expect(published.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "/s7-local-probe");
        await expect(published.getByRole("link", { name: "SoundCloud", exact: true })).toHaveAttribute("href", "https://soundcloud.com/kebu-isolated-artist");
        await expect(published.locator("svg")).toHaveCount(1); await expect(published.locator("img")).toHaveCount(0);
        await expect(published.getByRole("link", { name: "Spotify", exact: true })).toHaveCount(0);
        });
      } finally { await context.close(); }
    }
    expect(authority.legacyWrites).toEqual([]); expect(errors).toEqual([]);
  } finally { await authority.server.close(); }
});
