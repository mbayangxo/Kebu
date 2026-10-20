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
    const crop = page.getByRole("slider", { name: /^Crop empty edges/ }); await crop.press("PageUp");
    const expectedCrop = Number(await crop.inputValue()); expect(expectedCrop).toBeGreaterThan(0);
    await expect.poll(() => value("layerCrop")).toBe(expectedCrop);
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
    const previousLeft = await layer.evaluate(element => parseFloat((element as HTMLElement).style.left));
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
    await page.getByRole("button", { name: "Publish", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Published ✓", exact: true })).toBeVisible();
    const published = await server.queryAs<{ count: number }>("postgres",owner,"select count(*)::int as count from deployments where project_id=$1 and status='live'",[projectId]);
    expect(published.rows[0]!.count).toBe(1); expect(authority.legacyWrites).toEqual([]); expect(errors).toEqual([]);
  } finally { await server.close(); }
});
