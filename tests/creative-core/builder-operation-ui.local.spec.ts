import { writeFileSync } from "node:fs";
import { evenlySpacedKeys } from "../../lib/creative-core";
import { test, expect, type Page } from "@playwright/test";
import { documentToRows } from "../../lib/create/kcd-adapter";
import { prepareBuilderTransaction } from "../../lib/create/kcd-write-boundary";
import type { NodeId, Transaction } from "../../lib/creative-core";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";

test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1", "Supplemental local UI harness: controlled authority, no QA authentication/database proof.");
const id = uuidFor(1, 0x91) as NodeId;
const projectId = "11111111-1111-4111-8111-111111111111";
async function authority(page: Page, failure?: "conflict" | "lost-reply" | "unavailable" | "nav-failure", size = 1) {
  let doc = emptyDocument(); doc.title = "Operation UI fixture"; doc.meta.documentSchemaVersion = "kcd-1";
  doc.nodes[id] = node({ id, pageId: PAGE_A, type: "legacy-section:hero", orderKey: "V", props: { heading: "Original", align: "center" } });
  const keys = evenlySpacedKeys(size);
  doc.nodes[id].orderKey = keys[0];
  for (let index = 1; index < size; index++) {
    const childId = uuidFor(index + 1, 0x91) as NodeId;
    doc.nodes[childId] = node({ id: childId, pageId: PAGE_A, type: "legacy-section:text", orderKey: keys[index], props: { heading: `Element ${index}`, body: "Performance fixture content" } });
  }
  const transactions: Transaction[] = []; const legacyWrites: string[] = []; const journal = new Map<string, unknown>();
  let dropped = false;
  await page.route("**/api/**", async (route) => {
    const request = route.request(); const pathname = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (pathname === `/api/projects/${projectId}`) {
      const rows = documentToRows(doc);
      return json({ ...rows, project: { ...rows.project, business_id: uuidFor(1, 0x92), subdomain: "local-fixture", status: "draft" }, renderPath: "kcd", publishState: { isLive: false, hasUnpublishedChanges: false, lastPublishedAt: null }, siteChrome: { enabled: false } });
    }
    if (pathname.endsWith("/billing")) return json({ canPublish: true, billingExempt: true });
    if (pathname.endsWith("/operations")) {
      if (request.method() === "GET") return failure === "unavailable" ? json({ error: "Operation editing is temporarily unavailable." }, 503) : json({ document: doc });
      const tx = request.postDataJSON() as Transaction; transactions.push(tx);
      if (failure === "conflict") return json({ error: "Changed elsewhere", conflicts: [{ id, expected: 1, actual: 2 }] }, 409);
      const replay = journal.get(tx.txId); if (replay) return json(replay);
      const result = prepareBuilderTransaction(doc, tx);
      if (!result.ok) return json({ error: result.error.message, ...result.error }, result.error.code === "KCD_CONFLICT" ? 409 : 400);
      doc = result.prediction.document;
      const acknowledgement = { status: "committed", versions: result.prediction.versions, removed: result.prediction.removed, removedPages: result.prediction.removedPages ?? [], pages: doc.pages.filter((page) => result.prediction.versions[page.id]), nodes: Object.keys(result.prediction.versions).flatMap((key) => doc.nodes[key as NodeId] ? [doc.nodes[key as NodeId]] : []) };
      journal.set(tx.txId, acknowledgement);
      if (failure === "lost-reply" && !dropped) { dropped = true; return json({ status: "committed" }); }
      return json(acknowledgement);
    }
    if (pathname.endsWith("/site-chrome/sync-nav")) return failure === "nav-failure" ? json({ error: "Nav sync failed" }, 500) : json({ ok: true });
    if (pathname.endsWith("/site-chrome")) return json({ siteChrome: { enabled: false } });
    if (pathname.endsWith("/pages") && request.method() !== "GET") { legacyWrites.push(pathname); return json({ error: "Unexpected legacy page write" }, 500); }
    if (/\/sections(?:\/|$)/.test(pathname) && request.method() !== "GET") { legacyWrites.push(pathname); return json({ error: "Unexpected legacy write" }, 500); }
    return json({});
  });
  return { transactions, legacyWrites, document: () => doc };
}
async function openInspector(page: Page, deviceLabel = "Desktop") {
  await page.goto(`/create/${projectId}`);
  if (deviceLabel !== "Desktop") await page.getByRole("button", { name: deviceLabel, exact: true }).first().click();
  if ((page.viewportSize()?.width ?? 1440) < 640) {
    for (const name of ["Desktop", "Tablet", "Phone", "Save draft", "Publish"]) {
      const control = page.getByRole("button", { name, exact: true }).first();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
    // Phone starts with the section panel closed so the canvas has room.
    await page.getByRole("button", { name: "Sections", exact: true }).first().click();
  }
  await page.getByRole("button", { name: "Edit section", exact: true }).first().click();
  await expect(page.getByRole("textbox", { name: "Hero heading" })).toHaveValue("Original");
}

test("property save → operation Undo/Redo → reload uses canonical storage and no legacy writes", async ({ page }) => {
  const server = await authority(page); const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await openInspector(page);
  await page.getByRole("textbox", { name: "Hero heading" }).fill("Edited in Builder");
  await expect.poll(() => server.document().nodes[id].props.heading).toBe("Edited in Builder");
  await expect(page.getByRole("button", { name: "Undo", exact: true }).first()).toBeEnabled();
  await page.getByRole("button", { name: "Undo", exact: true }).first().click();
  await expect(page.getByRole("textbox", { name: "Hero heading" })).toHaveValue("Original");
  await page.getByRole("button", { name: "Redo", exact: true }).first().click();
  await expect.poll(() => server.document().nodes[id].props.heading).toBe("Edited in Builder");
  await expect(page.getByText("Draft saved", { exact: true }).first()).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Edit section", exact: true }).first().click();
  await expect(page.getByRole("textbox", { name: "Hero heading" })).toHaveValue("Edited in Builder");
  expect(server.transactions.map((tx) => tx.expect[id])).toEqual([1, 2, 3]);
  expect(server.legacyWrites).toEqual([]); expect(errors).toEqual([]);
  await page.screenshot({ path: "evidence/3c/s5/local-builder-1440.png" });
});
test("conflict preserves the user's edit and shows the failure", async ({ page }) => {
  const server = await authority(page, "conflict"); await openInspector(page);
  await page.getByRole("textbox", { name: "Hero heading" }).fill("My pending edit");
  await expect(page.getByRole("textbox", { name: "Hero heading" })).toHaveValue("My pending edit");
  await expect(page.getByRole("alert").filter({ hasText: "Changed elsewhere" }).first()).toBeVisible();
  expect(server.document().nodes[id].props.heading).toBe("Original"); expect(server.legacyWrites).toEqual([]);
});
test("device editing preserves Desktop and Undo/Redo travels override plus state atomically", async ({ page }) => {
  const server = await authority(page); await openInspector(page);
  await page.getByRole("button", { name: "Phone", exact: true }).first().click();
  await page.getByRole("textbox", { name: "Hero heading" }).fill("Phone only");
  await expect.poll(() => server.document().nodes[id].overrides.mobile?.heading).toBe("Phone only");
  expect(server.document().nodes[id].props.heading).toBe("Original");
  expect(server.document().nodes[id].responsiveState?.mode).toBe("custom");
  expect(server.transactions[0].ops.map((op) => op.op)).toEqual(["setOverride", "setResponsiveState"]);
  await page.getByRole("button", { name: "Desktop", exact: true }).first().click();
  await expect(page.getByRole("textbox", { name: "Hero heading" })).toHaveValue("Original");
  await page.getByRole("button", { name: "Undo", exact: true }).first().click();
  await expect.poll(() => server.document().nodes[id].overrides.mobile?.heading ?? null).toBeNull();
  await page.getByRole("button", { name: "Redo", exact: true }).first().click();
  await expect.poll(() => server.document().nodes[id].overrides.mobile?.heading).toBe("Phone only");
  expect(server.legacyWrites).toEqual([]);
});
test("duplicate → remove → Undo restores the same id through structural operations", async ({ page }) => {
  const server = await authority(page); await openInspector(page);
  await page.getByRole("button", { name: "Duplicate", exact: true }).first().click();
  await expect.poll(() => Object.keys(server.document().nodes).length).toBe(2);
  const copyId = Object.keys(server.document().nodes).find((key) => key !== id)! as NodeId;
  await page.getByRole("button", { name: "Remove", exact: true }).first().click();
  await page.getByRole("group", { name: "Confirm remove section", exact: true }).getByRole("button", { name: "Remove", exact: true }).click();
  await expect.poll(() => Object.keys(server.document().nodes).length).toBe(1);
  expect(server.document().nodes[id]).toBeDefined();
  await page.getByRole("button", { name: "Undo", exact: true }).first().click();
  await expect.poll(() => server.document().nodes[copyId]?.version).toBe(2);
  expect(server.transactions.map((tx) => tx.ops[0].op)).toEqual(["insertNode", "removeNode", "restoreSubtree"]);
  expect(server.legacyWrites).toEqual([]);
});
test("a truncated committed reply retries the exact transaction without a second version bump", async ({ page }) => {
  const server = await authority(page, "lost-reply"); await openInspector(page);
  await page.getByRole("textbox", { name: "Hero heading" }).fill("Retry once");
  await expect.poll(() => server.transactions.length).toBe(1);
  await expect(page.getByText(/acknowledgement/i).first()).toBeVisible();
  await page.getByRole("button", { name: "Save draft", exact: true }).first().click();
  await expect.poll(() => server.transactions.length).toBe(2);
  expect(server.transactions[1]).toEqual(server.transactions[0]);
  expect(server.document().nodes[id].version).toBe(2);
  await expect(page.getByText("Draft saved", { exact: true }).first()).toBeVisible();
});
test("missing operation protocol blocks the editing surface with Retry", async ({ page }) => {
  const server = await authority(page, "unavailable"); await page.goto(`/create/${projectId}`);
  await expect(page.getByRole("alert").filter({ hasText: "temporarily unavailable" }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry", exact: true }).last()).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Hero heading" })).toHaveCount(0);
  expect(server.transactions).toEqual([]);
});
for (const width of [768, 390]) test(`local operation Builder loads at ${width}px`, async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width, height: 900 }); await authority(page); await page.goto(`/create/${projectId}`);
  await expect(page.getByText("Operation UI fixture", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Loading…", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `evidence/3c/s5/local-builder-${width}.png` });
});

// Supplements QA evidence: real Builder/React/Chromium, controlled authority without auth/SQL.
const performanceResults: Array<{ nodes: number; device: string; viewportWidth: number; samplesMs: number[]; medianMs: number }> = [];
for (const target of [
  { device: "desktop", label: "Desktop", width: 1440 },
  { device: "tablet", label: "Tablet", width: 768 },
  { device: "mobile", label: "Phone", width: 390 },
]) for (const size of [100, 500, 2000]) test(`Builder ${target.device} edit-to-painted-canvas baseline at ${size} nodes`, async ({ page }) => {
  test.skip(!process.env.KEBU_BUILDER_BROWSER_PERF_REPORT, "Optional evidence run; not the authenticated QA gate.");
  test.setTimeout(60_000);
  await page.setViewportSize({ width: target.width, height: 900 });
  const server = await authority(page, undefined, size);
  await openInspector(page, target.label);
  // Tablet/Phone render their live canvas inside the real responsive preview iframe.
  const canvas = target.device === "desktop" ? page : page.frameLocator(`iframe[title="${target.device} preview"]`);
  await expect(canvas.getByRole("heading", { name: "Original", exact: true }).first()).toBeVisible();
  if (target.device !== "desktop") await canvas.locator("body").evaluate(() => {
    const capture = window as unknown as { previewDeltaSizes: number[] };
    capture.previewDeltaSizes = [];
    window.addEventListener("message", (event) => {
      if (event.data?.type === "kebu:definition:patch" && event.data.update?.kind === "delta") {
        capture.previewDeltaSizes.push(event.data.update.sections.length);
      }
    });
  });
  const samplesMs: number[] = [];
  for (let index = 0; index < 9; index++) {
    const value = `Painted ${size} nodes ${index}`;
    const start = await page.evaluate(() => performance.now());
    await page.getByRole("textbox", { name: "Hero heading" }).fill(value);
    await expect(canvas.getByRole("heading", { name: value, exact: true }).first()).toBeVisible();
    await canvas.locator("body").evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const end = await page.evaluate(() => performance.now());
    if (index > 1) samplesMs.push(end - start);
    await expect.poll(() => target.device === "desktop" ? server.document().nodes[id].props.heading
      : server.document().nodes[id].overrides[target.device as "tablet" | "mobile"]?.heading).toBe(value);
  }
  if (target.device !== "desktop") {
    const sizes = await canvas.locator("body").evaluate(() => (window as unknown as { previewDeltaSizes: number[] }).previewDeltaSizes);
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.max(...sizes)).toBe(1);
  }
  const sorted = [...samplesMs].sort((a, b) => a - b);
  performanceResults.push({ nodes: size, device: target.device, viewportWidth: target.width, samplesMs, medianMs: sorted[Math.floor(sorted.length / 2)] });
  writeFileSync(process.env.KEBU_BUILDER_BROWSER_PERF_REPORT!, JSON.stringify({
    scope: "Real Builder input fill through visible heading update and two animation frames at Desktop/Tablet/Phone viewport and edited device; includes Playwright command overhead. Controlled authority, no auth/SQL/network latency. Two warmups, seven samples. Other nodes are legacy text sections.",
    chromium: page.context().browser()?.version(), results: performanceResults,
  }, null, 2) + "\n");
});

test("Pages adds, renames, reorders and deletes through atomic operation history", async ({ page }) => {
  const server = await authority(page); await page.goto(`/create/${projectId}`);
  await page.getByRole("button", { name: "Pages", exact: true }).click();
  await page.getByRole("button", { name: "+ New page", exact: true }).click();
  await page.getByPlaceholder("Page title (e.g. About, Shop…)").fill("About");
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await expect.poll(() => server.document().pages.length).toBe(2);
  await expect(page.getByText("Draft saved", { exact: true }).first()).toBeVisible();
  const added = server.document().pages.find((p) => p.slug === "about")!;
  const nodeIds = Object.values(server.document().nodes).filter((n) => n.pageId === added.id).map((n) => n.id);
  expect(nodeIds).toHaveLength(2); expect(server.transactions[0].ops.map((op) => op.op)).toEqual(["insertPage", "insertNode", "insertNode"]);
  const row = page.locator("li").filter({ has: page.getByRole("button", { name: "About", exact: true }) });
  await row.hover(); await row.getByRole("button", { name: "Rename page" }).click();
  await page.getByPlaceholder("Title", { exact: true }).fill("About us");
  await page.getByPlaceholder("slug", { exact: true }).fill("about-us");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => server.document().pages.find((p) => p.id === added.id)?.slug).toBe("about-us");
  await expect(page.getByText("Draft saved", { exact: true }).first()).toBeVisible();
  const updated = page.locator("li").filter({ has: page.getByRole("button", { name: "About us", exact: true }) });
  await updated.hover(); await updated.getByRole("button", { name: "Move page up", exact: true }).click();
  await expect.poll(() => server.document().pages[0].id).toBe(added.id);
  await expect(page.getByText("Draft saved", { exact: true }).first()).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await updated.hover(); await updated.getByRole("button", { name: "Delete page", exact: true }).click();
  await expect.poll(() => server.document().pages.length).toBe(1);
  await expect(page.getByRole("button", { name: "Undo", exact: true }).first()).toBeEnabled();
  await page.getByRole("button", { name: "Undo", exact: true }).first().click();
  await expect.poll(() => server.document().pages.find((p) => p.id === added.id)?.slug).toBe("about-us");
  for (const id of nodeIds) expect(server.document().nodes[id].version).toBe(2);
  expect(server.legacyWrites).toEqual([]);
});

test("page save reports navigation failure and blocks Undo until reconciliation", async ({ page }) => {
  const server = await authority(page, "nav-failure"); await page.goto(`/create/${projectId}`);
  await page.getByRole("button", { name: "Pages", exact: true }).click();
  await page.getByRole("button", { name: "+ New page", exact: true }).click();
  await page.getByPlaceholder("Page title (e.g. About, Shop…)").fill("About");
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await expect.poll(() => server.document().pages.length).toBe(2);
  await expect(page.getByRole("alert").filter({ hasText: "navigation still needs synchronization" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo", exact: true }).first()).toBeDisabled();
  expect(server.legacyWrites).toEqual([]);
});
