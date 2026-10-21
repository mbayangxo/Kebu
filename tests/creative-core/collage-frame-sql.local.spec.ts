import { mkdirSync } from "node:fs";
import { test, expect } from "playwright/test";
import { openBuilderSqlBridge } from "./fixtures/builder-sql-bridge";
import { owner, projectId } from "./fixtures/3j-database";
import { defaultMaylecorKsendrProps } from "../../lib/create/maylecor-ksendr-defaults";
import { expectFor, type NodeId, type Op } from "../../lib/creative-core";

// Real editor/controller/normalizer/SQL; loopback transport is not hosted Auth.
test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1" || !process.env.KEBU_LOCAL_PGLITE_ROOT, "Requires isolated migrated SQL authority");
const id = "55555555-5555-4555-8555-555555555555" as NodeId;
for (const [device, width] of [["Desktop",1440],["Tablet",768],["Phone",390]] as const) test("ordinary " + device + " image dimensions/crop → SQL → Undo/Redo → reload → publish", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width, height: 1000 });
  const authority = await openBuilderSqlBridge(page, async server => {
    const doc = server.current();
    const ops: Op[] = [{ op: "insertNode", node: { id, type: "legacy-section:legally-blonde-hero", typeVersion: 1, props: defaultMaylecorKsendrProps(), overrides: {} }, pageId: doc.pages[0]!.id, parentId: null, orderKey: "V" }];
    await server.apply({ txId: crypto.randomUUID(), origin: "user", label: "Local image-frame specimen", ops, expect: expectFor(doc,ops) });
  });
  const { server } = authority, errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const key = device === "Desktop" ? "desktop" : device === "Tablet" ? "tablet" : "mobile";
  const effective = () => ({ ...server.current().nodes[id]!.props, ...(key === "desktop" ? {} : server.current().nodes[id]!.overrides[key]) });
  const value = (field: string) => (effective()[field] as Record<string,number> | undefined)?.cutoutAccent;
  const canvas = device === "Desktop" ? page : page.frameLocator(`iframe[title="${key} preview"]`);
  const closePanel = async () => {
    const done = page.getByRole("button", { name: "Done — view site", exact: true });
    if (await done.isVisible()) await done.click();
  };
  const selectImage = async () => {
    await closePanel();
    if (device !== "Desktop") await page.getByRole("button", { name: device, exact: true }).first().click();
    const layer = canvas.locator('[data-kebu-layer="cutoutAccent"]'); await expect(layer).toBeVisible(); await layer.press("Enter");
    // Size is an intentionally collapsed inspector accordion. Open the actual
    // user control before querying its hidden range inputs.
    const size = page.locator("summary").filter({ hasText: /^Size$/ });
    await expect(size).toBeVisible();
    const panel = size.locator("..");
    if (await panel.getAttribute("open") === null) await size.click();
    await expect(page.getByRole("slider", { name: /^Width/ })).toBeVisible();
  };
  try {
    await page.goto("/create/" + projectId); await selectImage();
    await page.getByRole("slider", { name: /^Width/ }).press("ArrowLeft"); await expect.poll(() => value("layerWidthScale")).toBe(.95);
    await page.getByRole("slider", { name: /^Height/ }).press("ArrowRight"); await expect.poll(() => value("layerHeightScale")).toBe(1.05);
    const imageFrame = canvas.locator('[data-kebu-layer="cutoutAccent"]');
    const beforeCrop = await imageFrame.boundingBox(); expect(beforeCrop).not.toBeNull();
    const crop = page.getByRole("slider", { name: /^Crop empty edges/ }); await crop.press("PageUp");
    const expectedCrop = Number(await crop.inputValue()); expect(expectedCrop).toBeGreaterThan(0);
    await expect.poll(() => value("layerCrop")).toBe(expectedCrop);
    await expect.poll(async () => Math.abs((await imageFrame.boundingBox())!.width - beforeCrop!.width * (1 - 2 * expectedCrop / 100))).toBeLessThan(0.6);
    await closePanel();
    await page.getByRole("button", { name: "Undo", exact: true }).first().click(); await expect.poll(() => value("layerCrop") ?? 0).toBe(0);
    await page.getByRole("button", { name: "Redo", exact: true }).first().click(); await expect.poll(() => value("layerCrop")).toBe(expectedCrop);
    const stored = (await server.queryAs<{ props: Record<string,unknown> }>("authenticated",owner,"select props from project_sections where id=$1",[id])).rows[0]!.props;
    const saved = key === "desktop" ? stored : (stored.deviceOverrides as Record<string,Record<string,unknown>>)[key];
    expect(saved).toMatchObject({ layerWidthScale: { cutoutAccent: .95 }, layerHeightScale: { cutoutAccent: 1.05 }, layerCrop: { cutoutAccent: expectedCrop } });
    if (key !== "desktop") expect(server.current().nodes[id]!.props.layerCrop).toBeUndefined();
    await page.reload(); await selectImage();
    await expect(page.getByRole("slider", { name: /^Width/ })).toHaveValue("0.95");
    await expect(page.getByRole("slider", { name: /^Height/ })).toHaveValue("1.05");
    await expect(page.getByRole("slider", { name: /^Crop empty edges/ })).toHaveValue(String(expectedCrop));
    mkdirSync("evidence/collage", { recursive: true });
    await page.screenshot({ path: `evidence/collage/inspector-${key}.png`, fullPage: true });
    // This originates in the actual iframe canvas, unlike the parent inspector.
    const layer = canvas.locator('[data-kebu-layer="cutoutAccent"]');
    const previousLeft = await layer.evaluate(element => parseFloat((element.closest('[data-kebu-source]') as HTMLElement).style.left));
    await layer.press("ArrowRight");
    const movedLeft = Math.min(90, previousLeft + 1);
    const savedLeft = () => (effective().layerPositions as Record<string,{leftPct:number}> | undefined)?.cutoutAccent?.leftPct;
    await expect.poll(savedLeft).toBe(movedLeft);
    await closePanel();
    await page.getByRole("button", { name: "Undo", exact: true }).first().click();
    await expect.poll(() => savedLeft() ?? previousLeft).toBe(previousLeft);
    await page.getByRole("button", { name: "Redo", exact: true }).first().click();
    await expect.poll(savedLeft).toBe(movedLeft);
    await closePanel();
    await layer.focus();
    const handle = canvas.getByRole("button", { name: "Resize top-left", exact: true });
    await expect(handle).toBeVisible(); await handle.scrollIntoViewIfNeeded();
    const beforeResize = (await layer.boundingBox())!, grip = (await handle.boundingBox())!;
    const oldScale = value("layerScales") ?? 1;
    const oldPosition = structuredClone((effective().layerPositions as Record<string, unknown>).cutoutAccent);
    const transactionCount = authority.transactions.length;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2); await page.mouse.down();
    await page.mouse.move(grip.x + grip.width / 2 - 18, grip.y + grip.height / 2 - 14, { steps: 6 });
    expect(authority.transactions).toHaveLength(transactionCount);
    await page.mouse.up();
    await expect.poll(() => authority.transactions.length).toBe(transactionCount + 1);
    expect(JSON.stringify(authority.transactions.at(-1)!.ops)).toContain("layerScales");
    expect(JSON.stringify(authority.transactions.at(-1)!.ops)).toContain("layerPositions");
    await expect.poll(() => value("layerScales") ?? 1).toBeGreaterThan(oldScale);
    const resizedScale = value("layerScales"), resizedPosition = structuredClone((effective().layerPositions as Record<string, unknown>).cutoutAccent);
    const afterResize = (await layer.boundingBox())!;
    expect(Math.abs(afterResize.x + afterResize.width - beforeResize.x - beforeResize.width)).toBeLessThan(1.5);
    expect(Math.abs(afterResize.y + afterResize.height - beforeResize.y - beforeResize.height)).toBeLessThan(1.5);
    await page.screenshot({ path: `evidence/collage/resized-${key}.png`, fullPage: true });
    await expect(page.getByRole("button", { name: "Done — view site", exact: true })).toBeHidden();
    await page.getByRole("button", { name: "Undo", exact: true }).first().click();
    await expect.poll(() => value("layerScales") ?? 1).toBe(oldScale);
    expect((effective().layerPositions as Record<string, unknown>).cutoutAccent).toEqual(oldPosition);
    await page.getByRole("button", { name: "Redo", exact: true }).first().click();
    await expect.poll(() => value("layerScales")).toBe(resizedScale);
    expect((effective().layerPositions as Record<string, unknown>).cutoutAccent).toEqual(resizedPosition);
    await layer.focus(); await expect(handle).toBeVisible();
    const centeredBefore = (await layer.boundingBox())!, keyboardTransactions = authority.transactions.length;
    await handle.press("Alt+ArrowLeft");
    await expect.poll(() => authority.transactions.length).toBe(keyboardTransactions + 1);
    const centeredAfter = (await layer.boundingBox())!;
    expect(Math.abs(centeredAfter.x + centeredAfter.width / 2 - centeredBefore.x - centeredBefore.width / 2)).toBeLessThan(1.5);
    expect(Math.abs(centeredAfter.y + centeredAfter.height / 2 - centeredBefore.y - centeredBefore.height / 2)).toBeLessThan(1.5);
    await page.getByRole("button", { name: "Undo", exact: true }).first().click();
    await expect.poll(() => value("layerScales")).toBe(resizedScale);
    await closePanel();
    if (device === "Phone") {
      await layer.focus(); await handle.scrollIntoViewIfNeeded();
      const cdp = await page.context().newCDPSession(page);
      try {
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
        const grip = (await handle.boundingBox())!, x = grip.x + grip.width / 2, y = grip.y + grip.height / 2;
        const count = authority.transactions.length, old = value("layerScales") ?? 1;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 12, y: y - 12, id: 1 }] });
        expect(authority.transactions).toHaveLength(count);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await expect.poll(() => authority.transactions.length).toBe(count + 1);
        await expect.poll(() => value("layerScales") ?? 1).toBeGreaterThan(old);
        await page.getByRole("button", { name: "Undo", exact: true }).first().click();
        await expect.poll(() => value("layerScales") ?? 1).toBe(old);
        await layer.focus();
        const next = (await handle.boundingBox())!, cancelX = next.x + next.width / 2, cancelY = next.y + next.height / 2;
        const beforeCancel = (await layer.boundingBox())!, cancelCount = authority.transactions.length;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cancelX, y: cancelY, id: 2 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cancelX - 18, y: cancelY - 18, id: 2 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
        await page.getByRole("button", { name: "Save draft", exact: true }).first().click();
        expect(authority.transactions).toHaveLength(cancelCount);
        const afterCancel = (await layer.boundingBox())!;
        expect(Math.abs(afterCancel.width - beforeCancel.width)).toBeLessThan(0.6);
        expect(Math.abs(afterCancel.x - beforeCancel.x)).toBeLessThan(0.6);
      } finally { await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false }); await cdp.detach(); }
    }
    await layer.press("Enter");
    const appearance = page.locator("summary").filter({ hasText: /^Appearance$/ });
    if (await appearance.locator("..").getAttribute("open") === null) await appearance.click();
    await page.getByRole("spinbutton", { name: "Layer rotation", exact: true }).fill("30");
    await expect.poll(() => value("layerRotation")).toBe(30);
    await closePanel(); await layer.focus(); await handle.scrollIntoViewIfNeeded();
    const corner = (sign: -1 | 1) => layer.evaluate((element, sign) => {
      const scene = (element.closest("[data-kebu-source]") as HTMLElement).offsetParent as HTMLElement;
      const rect = element.getBoundingClientRect(), scale = scene.getBoundingClientRect().width / scene.clientWidth;
      const x = sign * (element as HTMLElement).offsetWidth * scale / 2, y = sign * (element as HTMLElement).offsetHeight * scale / 2;
      return { x: rect.x + rect.width / 2 + Math.cos(Math.PI / 6) * x - Math.sin(Math.PI / 6) * y,
        y: rect.y + rect.height / 2 + Math.sin(Math.PI / 6) * x + Math.cos(Math.PI / 6) * y, scale };
    }, sign);
    const nw = await corner(-1), se = await corner(1);
    const handleCenter = await handle.evaluate(element => { const r = element.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    expect(Math.abs(handleCenter.x - nw.x - (Math.cos(Math.PI / 6) - Math.sin(Math.PI / 6)) * 6 * nw.scale)).toBeLessThan(2);
    expect(Math.abs(handleCenter.y - nw.y - (Math.sin(Math.PI / 6) + Math.cos(Math.PI / 6)) * 6 * nw.scale)).toBeLessThan(2);
    const rotatedGrip = (await handle.boundingBox())!, rotationCount = authority.transactions.length;
    await page.mouse.move(rotatedGrip.x + rotatedGrip.width / 2, rotatedGrip.y + rotatedGrip.height / 2); await page.mouse.down();
    await page.mouse.move(rotatedGrip.x + rotatedGrip.width / 2 - 12, rotatedGrip.y + rotatedGrip.height / 2 - 18, { steps: 6 });
    await page.mouse.up(); await expect.poll(() => authority.transactions.length).toBe(rotationCount + 1);
    const anchored = await corner(1);
    expect(Math.abs(anchored.x - se.x)).toBeLessThan(1.5); expect(Math.abs(anchored.y - se.y)).toBeLessThan(1.5);
    await page.getByRole("button", { name: "Undo", exact: true }).first().click();
    await expect.poll(() => value("layerRotation")).toBe(30);
    await page.screenshot({ path: `evidence/collage/rotated-${key}.png`, fullPage: true });
    await page.getByRole("button", { name: "Publish", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Published ✓", exact: true })).toBeVisible();
    const published = await server.queryAs<{ count: number }>("postgres",owner,"select count(*)::int as count from deployments where project_id=$1 and status='live'",[projectId]);
    expect(published.rows[0]!.count).toBe(1); expect(authority.legacyWrites).toEqual([]); expect(errors).toEqual([]);
  } finally { await server.close(); }
});
