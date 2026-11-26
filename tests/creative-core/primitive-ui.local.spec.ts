import { writeFileSync } from "node:fs";
import { evenlySpacedKeys, type KcdDocument } from "../../lib/creative-core";
import { test, expect, type Page } from "playwright/test";
import { documentToRows } from "../../lib/create/kcd-adapter";
import { prepareBuilderTransaction } from "../../lib/create/kcd-write-boundary";
import type { NodeId, Transaction } from "../../lib/creative-core";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";
import { nestedOrderFixture } from "./fixtures/nested-order";
import { artDirectionFixture } from "./fixtures/art-direction";
import { motionFixture } from "./fixtures/motion";
import { videoFixture } from "./fixtures/video";
import { decompositionFixture } from "./fixtures/decomposition";

test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1", "Controlled local authority; authenticated QA is deferred.");
const projectId = "11111111-1111-4111-8111-111111111111";
const legacyId = uuidFor(1, 0xcd) as NodeId;
async function authority(page: Page, conflict: boolean | "spatial" | "motion" = false, initial?: KcdDocument) {
  let document = emptyDocument(); document.title = "Native editor journey"; document.meta.documentSchemaVersion = "kcd-1";
  document.nodes[legacyId] = node({ id: legacyId, type: "legacy-section:text", pageId: PAGE_A, orderKey: "V", props: { heading: "Legacy story", body: "Legacy content stays intact" } });
  if (initial) document = initial;
  const transactions: Transaction[] = [], legacyWrites: string[] = [], journal = new Map<string, unknown>();
  await page.route("**/api/**", async (route) => {
    const request = route.request(), pathname = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (pathname === `/api/projects/${projectId}`) {
      const rows = documentToRows(document);
      return json({ ...rows, project: { ...rows.project, subdomain: "native-fixture", status: "draft" }, renderPath: "kcd", publishState: { isLive: false, hasUnpublishedChanges: false, lastPublishedAt: null }, siteChrome: { enabled: false } });
    }
    if (pathname.endsWith("/operations")) {
      if (request.method() === "GET") return json({ document });
      const tx = request.postDataJSON() as Transaction; transactions.push(tx);
      if (conflict === "motion" && tx.ops.some(op => op.op === "setMotion")) return json({ error: "Animation changed elsewhere", conflicts: [{ id: (tx.ops[0] as { id: string }).id, expected: 1, actual: 2 }] }, 409);
      if (conflict === "spatial" && tx.label === "Change element layout") return json({ error: "Layout changed elsewhere", conflicts: [{ id: (tx.ops[0] as { id: string }).id, expected: 1, actual: 2 }] }, 409);
      if (conflict === true && tx.ops.some((op) => op.op === "setProp" && op.path === "text")) return json({ error: "Changed elsewhere", conflicts: [{ id: (tx.ops[0] as { id: string }).id, expected: 1, actual: 2 }] }, 409);
      const replay = journal.get(tx.txId); if (replay) return json(replay);
      const result = prepareBuilderTransaction(document, tx);
      if (!result.ok) return json({ error: result.error.message, ...result.error }, result.error.code === "KCD_CONFLICT" ? 409 : 400);
      document = result.prediction.document;
      const ack = { status: "committed", versions: result.prediction.versions, removed: result.prediction.removed, removedPages: result.prediction.removedPages ?? [], pages: document.pages.filter((page) => result.prediction.versions[page.id]), nodes: Object.keys(result.prediction.versions).flatMap((id) => document.nodes[id as NodeId] ? [document.nodes[id as NodeId]] : []) };
      journal.set(tx.txId, ack); return json(ack);
    }
    if (/\/sections(?:\/|$)/.test(pathname) && request.method() !== "GET") { legacyWrites.push(pathname); return json({ error: "Unexpected legacy write" }, 500); }
    if (pathname.endsWith("/settings") && request.method() === "PATCH") return json({ project: { id: projectId, ...request.postDataJSON() } });
    if (pathname.endsWith("/billing")) return json({ canPublish: true, billingExempt: true });
    if (pathname.endsWith("/site-chrome")) return json({ siteChrome: { enabled: false } });
    if (pathname.endsWith("/assets")) return json({ assets: [] });
    return json({});
  });
  return { document: () => document, transactions, legacyWrites };
}
async function labelledControls(page: Page) {
  // Element handles can belong to a just-replaced inspector during acknowledgement; retry the live DOM.
  await expect.poll(async () => page.getByRole("region", { name: "Native elements", exact: true }).locator("input:not([type=file]), select, textarea").evaluateAll((fields) => fields.filter((field) => !(field as HTMLInputElement).labels?.length).map((field) => field.outerHTML))).toEqual([]);
}
async function open(page: Page, device = "Desktop") {
  await page.goto(`/create/${projectId}`);
  await page.getByRole("button", { name: "Add native section", exact: true, includeHidden: true }).waitFor({ state: "attached" });
  if (await page.getByRole("button", { name: "Done — view site", exact: true }).isVisible()) await page.getByRole("button", { name: "Done — view site", exact: true }).click();
  if (device !== "Desktop") await page.getByRole("button", { name: device, exact: true }).first().click();
  if ((page.viewportSize()?.width ?? 1440) < 1024) await page.getByRole("button", { name: "Build", exact: true }).first().click();
  await page.getByRole("button", { name: "Add native section", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add group", exact: true })).toBeVisible();
  await labelledControls(page);
  await page.getByRole("button", { name: "Add group", exact: true }).click();
  await labelledControls(page);
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Text", exact: true })).toHaveValue("Write your text");
}
async function editText(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Text", exact: true }).fill(text);
  await page.getByRole("combobox", { name: "Text style", exact: true }).focus();
}

for (const width of [390, 640, 768, 1024, 1440]) {
  test(`editor header controls do not overlap at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await authority(page);
    await page.goto(`/create/${projectId}`);
    const closePanel = page.getByRole("button", { name: "Done — view site", exact: true });
    if (await closePanel.isVisible()) await closePanel.click();
    const header = page.locator("header").filter({ has: page.getByRole("button", { name: "Publish", exact: true }) });
    await expect(header.getByRole("status")).toHaveText("Draft saved");
    const controls = [header.getByRole("status"), header.getByRole("button", { name: "Publish", exact: true })];
    if (width >= 768) controls.push(header.getByRole("combobox", { name: "Editing page" }));
    const boxes = await Promise.all(controls.map((control) => control.boundingBox()));
    for (const box of boxes) {
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!, b = boxes[j]!;
      expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
    }
    await page.screenshot({ path: `evidence/3c/s7/header-${width}.png` });
  });
}

for (const [device, viewport] of [["Desktop", { width: 1440, height: 1000 }], ["Tablet", { width: 768, height: 1024 }], ["Phone", { width: 390, height: 844 }]] as const) {
  test(`${device}: add hierarchy → edit → Undo/Redo → preview → reload`, async ({ page }) => {
    await page.setViewportSize(viewport); const server = await authority(page), errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message)); await open(page, device);
    await editText(page, `${device} story`);
    await labelledControls(page);
    const nativeText = () => Object.values(server.document().nodes).find((node) => node.type === "text")!;
    await expect.poll(() => device === "Desktop" ? nativeText().props.text : nativeText().overrides[device === "Phone" ? "mobile" : "tablet"]?.text).toBe(`${device} story`);
    if (device !== "Desktop") expect(nativeText().props.text).toBe("Write your text");
    if (viewport.width < 1024) await page.getByRole("button", { name: "Done — view site", exact: true }).click();
    const undo = page.getByRole("button", { name: "Undo", exact: true }).first();
    await undo.click();
    if (viewport.width < 1024) await page.getByRole("button", { name: "Build", exact: true }).first().click();
    await expect(page.getByRole("textbox", { name: "Text", exact: true })).toHaveValue("Write your text");
    if (viewport.width < 1024) await page.getByRole("button", { name: "Done — view site", exact: true }).click();
    const redo = page.getByRole("button", { name: "Redo", exact: true }).first();
    await redo.click();
    if (viewport.width < 1024) await page.getByRole("button", { name: "Build", exact: true }).first().click();
    await expect(page.getByRole("textbox", { name: "Text", exact: true })).toHaveValue(`${device} story`);
    if (viewport.width < 1024) await page.getByRole("button", { name: "Done — view site", exact: true }).click();
    const target = device === "Desktop" ? page : page.frameLocator(`iframe[title="${device === "Phone" ? "mobile" : "tablet"} preview"]`);
    await expect(target.locator(`[data-kcd-node-id="${nativeText().id}"]`)).toHaveText(`${device} story`);
    await page.screenshot({ path: `evidence/3c/s6/${device.toLowerCase()}-editor.png` });
    await expect(page.getByText("Draft saved", { exact: true }).first()).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Add native section", exact: true, includeHidden: true }).waitFor({ state: "attached" });
    if (await page.getByRole("button", { name: "Done — view site", exact: true }).isVisible()) await page.getByRole("button", { name: "Done — view site", exact: true }).click();
    if (device !== "Desktop") await page.getByRole("button", { name: device, exact: true }).first().click();
    if (viewport.width < 1024) await page.getByRole("button", { name: "Build", exact: true }).first().click();
    await page.getByRole("button", { name: `Text: ${device} story`, exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Text", exact: true })).toHaveValue(`${device} story`);
    expect(Object.values(server.document().nodes).filter((node) => node.type === "section")).toHaveLength(1);
    expect(nativeText().parentId).not.toBeNull(); expect(server.legacyWrites).toEqual([]); expect(errors).toEqual([]);
  });
}
test("images, accessibility, nesting, duplicate/remove history and invalid-address recovery", async ({ page }) => {
  const server = await authority(page); await open(page); await editText(page, "Our studio");
  await expect.poll(() => Object.values(server.document().nodes).find((node) => node.type === "text")?.props.text).toBe("Our studio");
  await page.getByRole("combobox", { name: "Heading level", exact: true }).selectOption("1");
  await expect(page.locator('h1[data-kcd-node-type="text"]')).toHaveText("Our studio");
  await page.getByRole("button", { name: "Edit parent container", exact: true }).click();
  await page.getByRole("button", { name: "Add image", exact: true }).click();
  await labelledControls(page);
  await page.getByRole("textbox", { name: "Image address", exact: true }).fill("//foreign.example/image.png");
  await page.getByRole("combobox", { name: "Image fit", exact: true }).focus();
  await expect(page.getByRole("alert").filter({ hasText: /Choose a valid value for image address/ }).first()).toBeVisible();
  await page.getByRole("textbox", { name: "Image address", exact: true }).fill("/templates/maylecor/logo-stacked.png");
  await page.getByRole("textbox", { name: "Alternative text", exact: true }).fill("Studio logo");
  await page.getByRole("combobox", { name: "Image fit", exact: true }).focus();
  await expect(page.getByRole("img", { name: "Studio logo", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Decorative image", exact: true }).check();
  await expect.poll(() => Object.values(server.document().nodes).find((node) => node.type === "image")?.a11y?.decorative).toBe(true);
  await page.getByRole("button", { name: "Edit parent container", exact: true }).click();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect.poll(() => Object.values(server.document().nodes).filter((node) => node.type === "image").length).toBe(2);
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByRole("button", { name: "Confirm remove", exact: true }).click();
  await expect.poll(() => Object.values(server.document().nodes).filter((node) => node.type === "image").length).toBe(1);
  await page.getByRole("button", { name: "Undo", exact: true }).first().click();
  await expect.poll(() => Object.values(server.document().nodes).filter((node) => node.type === "image").length).toBe(2);
  expect(server.document().nodes[legacyId].props.body).toBe("Legacy content stays intact"); expect(server.legacyWrites).toEqual([]);
});
test("native conflict preserves the pending text and exposes the failure", async ({ page }) => {
  const server = await authority(page, true); await open(page); await editText(page, "Keep my pending story");
  await expect(page.getByRole("alert").filter({ hasText: "Changed elsewhere" }).first()).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Text", exact: true })).toHaveValue("Keep my pending story");
  expect(Object.values(server.document().nodes).find((node) => node.type === "text")?.props.text).toBe("Write your text");
});

test("reparent, root device order, nested canvas selection and hide/show use stable ids", async ({ page }) => {
  const server = await authority(page); await open(page); await editText(page, "Selectable story");
  const nativeText = () => Object.values(server.document().nodes).find((node) => node.type === "text")!;
  const root = () => Object.values(server.document().nodes).find((node) => node.type === "section")!;
  await expect.poll(() => nativeText().props.text).toBe("Selectable story");
  const stableId = nativeText().id;
  await page.getByRole("textbox", { name: "Text colour", exact: true }).fill("#123456");
  await page.getByRole("combobox", { name: "Text style", exact: true }).focus();
  await expect.poll(() => nativeText().props.color).toBe("#123456");
  await page.getByRole("button", { name: "Use type default for text colour", exact: true }).click();
  await expect.poll(() => nativeText().props.color).toBeUndefined();
  await page.getByRole("combobox", { name: "Container", exact: true }).selectOption(root().id);
  await expect.poll(() => nativeText().parentId).toBe(root().id);
  await page.locator(`[data-kcd-root-id="${root().id}"]`).focus();
  await page.locator(`[data-kcd-root-id="${root().id}"]`).press("Enter");
  await expect(page.getByRole("group", { name: "Section settings", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Phone", exact: true }).first().click();
  await page.getByRole("button", { name: "Move up", exact: true }).click();
  await expect.poll(() => server.document().pages[0].deviceLayout.mobile?.order).toEqual([root().id, legacyId]);
  expect(root().orderKey > server.document().nodes[legacyId].orderKey).toBe(true);
  const frame = page.frameLocator('iframe[title="mobile preview"]');
  await frame.locator(`[data-kcd-node-id="${stableId}"]`).click();
  await expect(page.getByRole("group", { name: "Text settings", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Hide on phone", exact: true }).check();
  await expect(frame.locator(`[data-kcd-node-id="${stableId}"]`)).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Hide on phone", exact: true }).uncheck();
  await expect(frame.locator(`[data-kcd-node-id="${stableId}"]`)).toHaveText("Selectable story");
  expect(nativeText().id).toBe(stableId); expect(server.legacyWrites).toEqual([]);
});
test("unsupported native capabilities surface visibly and preserve saved content", async ({ page }) => {
  const server = await authority(page), document = server.document();
  const root = uuidFor(10, 0xcd) as NodeId, text = uuidFor(11, 0xcd) as NodeId;
  document.nodes[root] = node({ id: root, type: "section", pageId: PAGE_A, orderKey: "W", a11y: { role: "region", label: "Stored section" } });
  document.nodes[text] = node({ id: text, type: "text", parentId: root, pageId: PAGE_A, orderKey: "V", props: { text: "Preserved future content" }, motion: { preset: "future" } });
  await page.goto(`/create/${projectId}`);
  await expect(page.getByRole("alert").filter({ hasText: "Invalid motion:" }).first()).toBeVisible();
  await expect(page.getByText("Legacy content stays intact", { exact: true })).toBeVisible();
  expect(server.document().nodes[text].motion).toEqual({ preset: "future" }); expect(server.transactions).toEqual([]);
});

const nativePerfResults: {device:string;nodes:number;medianMs:number;samplesMs:number[]}[]=[];
for (const [device,model] of [["desktop","Desktop"],["tablet","Tablet"],["mobile","Phone"]] as const) for (const size of [100,500,2000]) {
 test(`${model} native ${size}-node editing performance`,async({page})=>{
  test.skip(!process.env.KEBU_NATIVE_BROWSER_PERF_REPORT,"Opt-in native timing probe");test.setTimeout(90000);
  const doc=emptyDocument();doc.meta.documentSchemaVersion="kcd-1";
  const rootCount=Math.ceil(size/50),rootKeys=evenlySpacedKeys(rootCount);let count=0,first:NodeId|undefined;
  for(let r=0;r<rootCount;r++){
   const root=uuidFor(++count,0xface) as NodeId;doc.nodes[root]=node({id:root,type:"section",pageId:PAGE_A,orderKey:rootKeys[r]});
   const children=Math.min(49,size-count),keys=evenlySpacedKeys(children);
   for(let c=0;c<children;c++){const id=uuidFor(++count,0xface) as NodeId;first??=id;doc.nodes[id]=node({id,type:"text",pageId:PAGE_A,parentId:root,orderKey:keys[c],props:{text:`Native text ${count}`}});}
  }
  const server=await authority(page,false,doc);await page.goto(`/create/${projectId}`);
  if(await page.getByRole("button",{name:"Done — view site",exact:true}).isVisible())await page.getByRole("button",{name:"Done — view site",exact:true}).click();
  if(model!=="Desktop")await page.getByRole("button",{name:model,exact:true}).first().click();
  const canvas=device==="desktop"?page:page.frameLocator(`iframe[title="${device} preview"]`);
  await canvas.locator(`[data-kcd-node-id="${first}"]`).click();
  const input=page.getByRole("textbox",{name:"Text",exact:true});await expect(input).toBeVisible();
  const samples:number[]=[];
  for(let n=0;n<9;n++){
   const value=`Edit ${device} ${size} ${n}`;const start=await page.evaluate(()=>performance.now());
   await input.fill(value);await input.press("Tab");await expect(canvas.locator(`[data-kcd-node-id="${first}"]`)).toHaveText(value);
   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
   const elapsed=await page.evaluate(()=>performance.now())-start;if(n>=2)samples.push(elapsed);
  }
  const sorted=[...samples].sort((a,b)=>a-b);nativePerfResults.push({device,nodes:size,medianMs:sorted[3],samplesMs:samples});
  writeFileSync(process.env.KEBU_NATIVE_BROWSER_PERF_REPORT!,JSON.stringify({scope:"Controlled local native editor; seven measured edits after two warmups",results:nativePerfResults},null,2));
  await expect.poll(() => device === "desktop" ? server.document().nodes[first!].props.text : server.document().nodes[first!].overrides[device]?.text).toBe(`Edit ${device} ${size} 8`);
 });
}

test("an unconfirmed publish is shown honestly and is never retried automatically",async({page})=>{
 const server=await authority(page);let attempts=0;
 await page.route(`**/api/projects/${projectId}/publish`,route=>{attempts++;return route.fulfill({status:503,json:{error:"Publishing could not be confirmed. Check your live site before retrying."}});});
 await open(page);await editText(page,"Keep the saved story");
 await expect.poll(()=>Object.values(server.document().nodes).find(node=>node.type==="text")?.props.text).toBe("Keep the saved story");
 await page.getByRole("button",{name:"Publish",exact:true}).first().click();
 await expect(page.getByRole("alert").filter({hasText:"Publishing could not be confirmed"})).toBeVisible();
 expect(attempts).toBe(1);expect(Object.values(server.document().nodes).find(node=>node.type==="text")?.props.text).toBe("Keep the saved story");
 await page.screenshot({path:"evidence/3c/s7/qa/unconfirmed-publish.png",fullPage:true});
});

test("spatial: drag, resize, cancel, layers, Undo/Redo and reload share canonical history", async ({ page }) => {
 await page.setViewportSize({width:1440,height:1000}); const server = await authority(page); await open(page);
 const text = () => Object.values(server.document().nodes).find(node => node.type === "text")!;
 const editNumber = async (name: string, value: string) => { const field = page.getByRole("textbox",{name,exact:true}); await field.fill(value); await field.press("Enter"); };
 await page.getByRole("combobox",{name:"Position",exact:true}).selectOption("absolute");
 await expect.poll(()=>text().props.position).toBe("absolute");
 await editNumber("Element width (px)","280"); await expect.poll(()=>text().props.elementWidth).toBe(280);
 await editNumber("Element height (px)","90"); await expect.poll(()=>text().props.elementHeight).toBe(90);
 const drag = async (name: string, dx: number, dy: number, cancel = false) => {
  const control = page.getByRole("button",{name,exact:true}); await expect(control).toBeVisible();
  const box = (await control.boundingBox())!; await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy,{steps:8});
  if(cancel) await page.keyboard.press("Escape"); await page.mouse.up();
 };
 const count = server.transactions.length;
 await drag("Move selected element",60,30);
 await expect.poll(()=>text().props.x).toBe(60); await expect.poll(()=>text().props.y).toBe(30);
 expect(server.transactions).toHaveLength(count+1);
 await drag("Resize selected element",40,20);
 await expect.poll(()=>text().props.elementWidth).toBe(320); await expect.poll(()=>text().props.elementHeight).toBe(110);
 const saved = structuredClone(text().props), cancelledCount = server.transactions.length;
 await drag("Move selected element",40,20,true); await page.waitForTimeout(150);
 expect(text().props).toEqual(saved); expect(server.transactions).toHaveLength(cancelledCount);
 await page.getByRole("button",{name:"Undo",exact:true}).first().click(); await expect.poll(()=>text().props.elementWidth).toBe(280);
 await page.getByRole("button",{name:"Redo",exact:true}).first().click(); await expect.poll(()=>text().props.elementWidth).toBe(320);
 // A canonical edit arriving during a gesture cancels the ghost without reverting the saved DOM.
 const interruptedCount = server.transactions.length;
 const handle = (await page.getByRole("button",{name:"Move selected element",exact:true}).boundingBox())!;
 await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+30,handle.y+handle.height/2+15);
 await editNumber("Element width (px)","360");await expect.poll(()=>text().props.elementWidth).toBe(360);await page.mouse.up();
 await expect(page.locator(`[data-kcd-node-id="${text().id}"]`)).toHaveCSS("width","360px");expect(server.transactions).toHaveLength(interruptedCount+1);
 await editNumber("Layer depth","7"); await expect.poll(()=>text().props.layer).toBe(7);
 const target = page.locator(`[data-kcd-node-id="${text().id}"]`);
 await expect(target).toHaveCSS("z-index","7");
 const invalidCount = server.transactions.length; await editNumber("Layer depth","-1");
 await expect(page.getByRole("alert").filter({hasText:"Choose a valid value for layer depth"})).toBeVisible(); expect(server.transactions).toHaveLength(invalidCount);
 await page.reload(); await expect(page.locator(`[data-kcd-node-id="${text().id}"]`)).toHaveCSS("left","60px");
 await expect(page.locator(`[data-kcd-node-id="${text().id}"]`)).toHaveCSS("width","360px");
 await page.locator(`[data-kcd-node-id="${text().id}"]`).click();
 expect(server.legacyWrites).toEqual([]); await page.screenshot({path:"evidence/3d/spatial-desktop.png",fullPage:true});
});

test("spatial: tablet and phone keyboard geometry remain independent of desktop", async ({page}) => {
 await page.setViewportSize({width:1440,height:1000}); const server=await authority(page); await open(page);
 const text=()=>Object.values(server.document().nodes).find(node=>node.type==="text")!;
 await page.getByRole("combobox",{name:"Position",exact:true}).selectOption("absolute");
 await expect.poll(()=>text().props.position).toBe("absolute");
 const width=page.getByRole("textbox",{name:"Element width (px)",exact:true});await width.fill("240");await width.press("Enter");await expect.poll(()=>text().props.elementWidth).toBe(240);
 await page.getByRole("button",{name:"Tablet",exact:true}).first().click();
 const tablet=page.frameLocator('iframe[title="tablet preview"]');
 await tablet.getByRole("button",{name:"Move selected element",exact:true}).press("Shift+ArrowRight");
 await expect.poll(()=>text().overrides.tablet?.x).toBe(10);expect(text().props.x).toBe(0);expect(text().overrides.mobile).toBeUndefined();
 await page.getByRole("button",{name:"Phone",exact:true}).first().click();
 const phone=page.frameLocator('iframe[title="mobile preview"]');
 await phone.getByRole("button",{name:"Resize selected element",exact:true}).press("Shift+ArrowRight");
 await expect.poll(()=>text().overrides.mobile?.elementWidth).toBe(250);expect(text().overrides.tablet?.elementWidth).toBe(240);expect(text().props.elementWidth).toBe(240);
 await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(()=>text().overrides.mobile).toBeUndefined();
 await page.getByRole("button",{name:"Redo",exact:true}).first().click();await expect.poll(()=>text().overrides.mobile?.elementWidth).toBe(250);
 await phone.getByRole("button",{name:"Move selected element",exact:true}).press("Shift+ArrowDown");await expect.poll(()=>text().overrides.mobile?.y).toBe(10);
 await expect(phone.locator(`[data-kcd-node-id="${text().id}"]`)).toHaveCSS("width","250px");
 expect(server.legacyWrites).toEqual([]);await page.screenshot({path:"evidence/3d/spatial-phone.png",fullPage:true});
});

test("spatial: container locks protect descendants and can be reopened",async({page})=>{
 await page.setViewportSize({width:1440,height:1000});const server=await authority(page);await open(page);
 const text=()=>Object.values(server.document().nodes).find(node=>node.type==="text")!;
 await page.getByRole("button",{name:"Edit parent container",exact:true}).click();
 await page.getByRole("button",{name:"Lock element",exact:true}).click();await expect.poll(()=>server.document().nodes[text().parentId!].locked).toBe(true);
 await page.getByRole("button",{name:"Show element hierarchy",exact:true}).click();
 await page.getByRole("button",{name:"Text: Write your text (locked)",exact:true}).click();
 await expect(page.getByRole("textbox",{name:"Text",exact:true})).toBeDisabled();await expect(page.getByRole("button",{name:"Move selected element",exact:true})).toHaveCount(0);
 await page.getByRole("button",{name:"Edit parent container",exact:true}).first().click();
 await page.getByRole("button",{name:"Unlock element",exact:true}).click();await expect.poll(()=>server.document().nodes[text().parentId!].locked).toBe(false);
 await page.getByRole("button",{name:"Edit Text: Write your text",exact:true}).click();await expect(page.getByRole("textbox",{name:"Text",exact:true})).toBeEnabled();
});


test("spatial: a failed layout commit preserves saved geometry and labels the pending canvas", async ({page}) => {
 await page.setViewportSize({width:1440,height:1000});const server=await authority(page,"spatial");await open(page);
 const text=()=>Object.values(server.document().nodes).find(node=>node.type==="text")!;
 await page.getByRole("combobox",{name:"Position",exact:true}).selectOption("absolute");await expect.poll(()=>text().props.position).toBe("absolute");
 const before=structuredClone(text().props),count=server.transactions.length;
 await page.getByRole("button",{name:"Move selected element",exact:true}).press("Shift+ArrowRight");
 await expect(page.getByRole("alert").filter({hasText:"Layout changed elsewhere"}).first()).toBeVisible();
 expect(text().props).toEqual(before);expect(server.transactions).toHaveLength(count+1);
 await expect(page.locator(`[data-kcd-node-id="${text().id}"]`)).toHaveCSS("left","10px");
 const header = page.locator("header").filter({has:page.getByRole("button",{name:"Publish",exact:true})});
 await expect(header.getByRole("status")).toHaveText("Layout changed elsewhere");
 let publishes = 0;await page.route(`**/api/projects/${projectId}/publish`,route=>{publishes++;return route.fulfill({json:{}});});
 await page.getByRole("button",{name:"Publish",exact:true}).first().click();expect(publishes).toBe(0);expect(server.transactions).toHaveLength(count+1);
});

function snappingFixture() {
 const doc=emptyDocument();doc.meta.documentSchemaVersion="kcd-1";
 const section=uuidFor(101,0xa11) as NodeId,group=uuidFor(102,0xa11) as NodeId,primary=uuidFor(103,0xa11) as NodeId,sibling=uuidFor(104,0xa11) as NodeId;
 doc.nodes[section]=node({id:section,type:"section",pageId:PAGE_A,orderKey:"V"});
 doc.nodes[group]=node({id:group,type:"group",parentId:section,pageId:PAGE_A,orderKey:"V",props:{elementWidth:600,canvasHeight:600},overrides:{tablet:{elementWidth:500},mobile:{elementWidth:300}}});
 doc.nodes[primary]=node({id:primary,type:"text",parentId:group,pageId:PAGE_A,orderKey:"V",props:{text:"Align this story",position:"absolute",x:0,y:30,elementWidth:100,elementHeight:80,layer:7}});
 doc.nodes[sibling]=node({id:sibling,type:"text",parentId:group,pageId:PAGE_A,orderKey:"W",props:{text:"Sibling target",position:"absolute",x:200,y:180,elementWidth:100,elementHeight:80}});
 return {doc,group,primary,sibling};
}

test("alignment: six container commands save once and survive Undo/Redo and reload",async({page})=>{
 await page.setViewportSize({width:1440,height:1000});const f=snappingFixture(),server=await authority(page,false,f.doc);await page.goto(`/create/${projectId}`);
 await page.locator(`[data-kcd-node-id="${f.primary}"]`).click();
 const box=()=>server.document().nodes[f.primary].props;
 for(const [label,key,value] of [["centre","x",250],["right","x",500],["left","x",0],["middle","y",260],["bottom","y",520],["top","y",0]] as const){
  const count=server.transactions.length;await page.getByText("Align",{exact:true}).click();await page.getByRole("button",{name:`Align ${label} to container`,exact:true}).click();
  await expect.poll(()=>box()[key]).toBe(value);expect(server.transactions).toHaveLength(count+1);expect(box().elementWidth).toBe(100);expect(box().elementHeight).toBe(80);
 }
 await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(()=>box().y).toBe(520);
 await page.getByRole("button",{name:"Redo",exact:true}).first().click();await expect.poll(()=>box().y).toBe(0);
 await page.reload();await expect(page.locator(`[data-kcd-node-id="${f.primary}"]`)).toHaveCSS("top","0px");
 expect(server.legacyWrites).toEqual([]);
});

for(const device of ["Desktop","Tablet","Phone"] as const) test(`alignment: ${device} sibling snapping, resize guides and cancellation`,async({page})=>{
 await page.setViewportSize({width:1440,height:1000});const f=snappingFixture(),server=await authority(page,false,f.doc);await page.goto(`/create/${projectId}`);
 if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();
 const key=device==="Desktop"?"desktop":device==="Tablet"?"tablet":"mobile";
 const canvas=device==="Desktop"?page:page.frameLocator(`iframe[title="${key} preview"]`);
 await canvas.locator(`[data-kcd-node-id="${f.primary}"]`).click();
 const effective=()=>({...server.document().nodes[f.primary].props,...(key==="desktop"?{}:server.document().nodes[f.primary].overrides[key])});
 const pointer=async(name:string,dx:number,dy:number)=>{
  const handle=canvas.getByRole("button",{name,exact:true});const r=(await handle.boundingBox())!;
  const scale=await canvas.locator(`[data-kcd-canvas-for="${f.group}"]`).evaluate(element=>element.getBoundingClientRect().width/(element as HTMLElement).offsetWidth);
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+dx*scale,r.y+r.height/2+dy*scale,{steps:8});
 };
 const count=server.transactions.length;await pointer("Move selected element",195,145);
 await expect(canvas.locator('[data-kcd-guide-axis="x"]')).toHaveCount(1);await expect(canvas.locator('[data-kcd-guide-axis="y"]')).toHaveCount(1);
 await page.screenshot({path:`evidence/3d/alignment-${key}-guides.png`,fullPage:true});await page.mouse.up();
 await expect.poll(()=>effective().x).toBe(200);await expect.poll(()=>effective().y).toBe(180);expect(server.transactions).toHaveLength(count+1);await expect(canvas.locator("[data-kcd-guide-axis]")).toHaveCount(0);
 await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(()=>effective().x).toBe(0);
 await pointer("Resize selected element",95,65);await expect(canvas.locator("[data-kcd-guide-axis]")).toHaveCount(2);await page.mouse.up();
 await expect.poll(()=>effective().elementWidth).toBe(200);await expect.poll(()=>effective().elementHeight).toBe(150);
 const cancelled=server.transactions.length;await pointer("Move selected element",5,145);await page.keyboard.press("Escape");await page.mouse.up();
 await expect(canvas.locator("[data-kcd-guide-axis]")).toHaveCount(0);expect(server.transactions).toHaveLength(cancelled);
 if(key!=="desktop")expect(server.document().nodes[f.primary].props.elementWidth).toBe(100);
});

test("alignment: snapping can be disabled and Alt bypasses it temporarily",async({page})=>{
 await page.setViewportSize({width:1440,height:1000});const f=snappingFixture(),server=await authority(page,false,f.doc);await page.goto(`/create/${projectId}`);await page.locator(`[data-kcd-node-id="${f.primary}"]`).click();
 const drag=async()=>{const r=(await page.getByRole("button",{name:"Move selected element",exact:true}).boundingBox())!;await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+195,r.y+r.height/2+145,{steps:8});await expect(page.locator("[data-kcd-guide-axis]")).toHaveCount(0);await page.mouse.up();};
 await page.getByRole("checkbox",{name:"Snap to edges and centres",exact:true}).uncheck();await drag();await expect.poll(()=>server.document().nodes[f.primary].props.x).toBe(195);
 await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(()=>server.document().nodes[f.primary].props.x).toBe(0);
 await page.getByRole("checkbox",{name:"Snap to edges and centres",exact:true}).check();await page.keyboard.down("Alt");await drag();await page.keyboard.up("Alt");await expect.poll(()=>server.document().nodes[f.primary].props.x).toBe(195);
});


for (const device of ["Desktop","Tablet","Phone"] as const) test(`constraints: ${device} captures anchors, adapts to container resize and preserves history`, async ({page}) => {
 await page.setViewportSize({width:1440,height:1000});const f=snappingFixture(),server=await authority(page,false,f.doc);await page.goto(`/create/${projectId}`);
 if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();
 const key=device==="Desktop"?"desktop":device==="Tablet"?"tablet":"mobile",canvas=device==="Desktop"?page:page.frameLocator(`iframe[title="${key} preview"]`);
 const target=canvas.locator(`[data-kcd-node-id="${f.primary}"]`);await target.click();
 const effective=()=>({...server.document().nodes[f.primary].props,...(key==="desktop"?{}:server.document().nodes[f.primary].overrides[key])});
 const width=device==="Desktop"?600:device==="Tablet"?500:300,count=server.transactions.length;
 await page.getByRole("combobox",{name:"Horizontal constraint",exact:true}).selectOption("end");
 await expect.poll(()=>effective().constraintX).toEqual({mode:"end",reference:width});expect(server.transactions).toHaveLength(count+1);await expect(target).toHaveCSS("left","0px");
 await page.getByRole("combobox",{name:"Vertical constraint",exact:true}).selectOption("stretch");await expect.poll(()=>effective().constraintY).toEqual({mode:"stretch",reference:600});
 await page.getByRole("textbox",{name:"Rotation (degrees)",exact:true}).fill("25");await page.getByRole("textbox",{name:"Rotation (degrees)",exact:true}).press("Enter");await expect.poll(()=>effective().rotation).toBe(25);
 await page.getByRole("textbox",{name:"Horizontal scale",exact:true}).fill("1.2");await page.getByRole("textbox",{name:"Horizontal scale",exact:true}).press("Enter");await expect.poll(()=>effective().scaleX).toBe(1.2);
 await page.getByRole("button",{name:"Edit parent container",exact:true}).last().click();
 await page.getByRole("textbox",{name:"Element width (px)",exact:true}).fill(String(width+100));await page.getByRole("textbox",{name:"Element width (px)",exact:true}).press("Enter");
 await expect(target).toHaveCSS("left","100px");
 await page.getByRole("textbox",{name:"Canvas minimum height (px)",exact:true}).fill("700");await page.getByRole("textbox",{name:"Canvas minimum height (px)",exact:true}).press("Enter");await expect(target).toHaveCSS("height","180px");await target.click();
 await canvas.getByRole("checkbox",{name:"Snap to edges and centres",exact:true}).uncheck();await canvas.getByRole("button",{name:"Move selected element",exact:true}).press("ArrowRight");
 await expect.poll(()=>effective().x).toBe(101);await expect.poll(()=>effective().constraintX).toEqual({mode:"end",reference:width+100});await expect(target).toHaveCSS("left","101px");
 await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect(target).toHaveCSS("left","100px");
 await page.getByRole("button",{name:"Redo",exact:true}).first().click();await expect(target).toHaveCSS("left","101px");
 await page.reload();if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();await expect(canvas.locator(`[data-kcd-node-id="${f.primary}"]`)).toHaveCSS("left","101px");
 if(key!=="desktop")expect(server.document().nodes[f.primary].props.rotation).toBeUndefined();expect(server.legacyWrites).toEqual([]);
});

test("constraints: nested rotated/scaled container pointer editing uses local coordinates",async({page})=>{
 await page.setViewportSize({width:1440,height:1000});const f=snappingFixture();f.doc.nodes[f.group].props.rotation=30;f.doc.nodes[f.group].props.scaleX=1.25;f.doc.nodes[f.group].props.scaleY=0.8;
 f.doc.nodes[f.primary].props.x=150;f.doc.nodes[f.primary].props.y=200;
 const server=await authority(page,false,f.doc);await page.goto(`/create/${projectId}`);await page.locator(`[data-kcd-node-id="${f.primary}"]`).click();
 await page.getByRole("checkbox",{name:"Snap to edges and centres",exact:true}).uncheck();
 const handle=page.getByRole("button",{name:"Move selected element",exact:true}),r=(await handle.boundingBox())!;
 const count=server.transactions.length;await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
 await page.mouse.move(r.x+r.width/2+Math.cos(Math.PI/6)*25,r.y+r.height/2+Math.sin(Math.PI/6)*25,{steps:8});await page.mouse.up();
 await expect.poll(()=>server.document().nodes[f.primary].props.x).toBe(170);await expect.poll(()=>server.document().nodes[f.primary].props.y).toBe(200);expect(server.transactions).toHaveLength(count+1);
 await page.screenshot({path:"evidence/3d/constraints-nested-transform.png",fullPage:true});
});

for (const device of ["Desktop", "Tablet", "Phone"] as const) test(`order: ${device} nested moves save, undo, redo, reload and reset`, async ({ page }) => {
 await page.setViewportSize({width:1440,height:1000});
 const f=nestedOrderFixture(false),server=await authority(page,false,f.doc),original=structuredClone(f.doc.nodes[f.children[0]]);
 const key=device==="Desktop"?"desktop":device==="Tablet"?"tablet":"mobile";
 const canvas=device==="Desktop"?page:page.frameLocator(`iframe[title="${key} preview"]`);
 const visualOrder=()=>canvas.locator(`[data-kcd-canvas-for="${f.group}"] [data-kcd-node-type="text"]`).evaluateAll(elements=>elements.map(element=>({id:element.getAttribute("data-kcd-node-id"),top:element.getBoundingClientRect().top})).sort((a,b)=>a.top-b.top).map(element=>element.id));
 await page.goto(`/create/${projectId}`);
 if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();
 await canvas.locator(`[data-kcd-node-id="${f.children[0]}"]`).click();
 const count=server.transactions.length;
 await page.getByRole("button",{name:"Move down",exact:true}).click();
 const reordered=[f.children[1],f.children[0],f.children[2]];
 await expect.poll(()=>server.transactions.length).toBe(count+1);await expect.poll(visualOrder).toEqual(reordered);
 if(key!=="desktop"){
  await expect.poll(()=>server.document().nodes[f.group].overrides[key]?.childOrder).toEqual(reordered);
  expect(server.document().nodes[f.group].overrides[key==="tablet"?"mobile":"tablet"]).toBeUndefined();
  expect(server.document().nodes[f.children[0]]).toEqual(original);
 }
 await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(visualOrder).toEqual(f.children);
 await page.getByRole("button",{name:"Redo",exact:true}).first().click();await expect.poll(visualOrder).toEqual(reordered);
 await page.reload();if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();await expect.poll(visualOrder).toEqual(reordered);
 await canvas.locator(`[data-kcd-node-id="${f.children[0]}"]`).click();
 await page.screenshot({path:`evidence/3d/order-editor-${key}.png`,fullPage:true});
 if(key!=="desktop"){
  await page.getByRole("button",{name:"Use desktop order",exact:true}).click();await expect.poll(visualOrder).toEqual(f.children);
  await expect.poll(()=>server.document().nodes[f.group].overrides[key]?.childOrder).toBeUndefined();
 }
 expect(server.legacyWrites).toEqual([]);await labelledControls(page);
});

for(const device of ["Desktop","Tablet","Phone"] as const)test(`art: ${device} pixel typography and focal controls save and preserve history`,async({page})=>{
 await page.setViewportSize({width:1440,height:1000});const f=artDirectionFixture(),server=await authority(page,false,f.doc),key=device==="Desktop"?"desktop":device==="Tablet"?"tablet":"mobile";
 const canvas=device==="Desktop"?page:page.frameLocator(`iframe[title="${key} preview"]`);
 await page.goto(`/create/${projectId}`);if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();
 await canvas.locator(`[data-kcd-node-id="${f.text}"]`).click();
 const effective=(id:NodeId)=>({...server.document().nodes[id].props,...(key==="desktop"?{}:server.document().nodes[id].overrides[key])});
 for(const [label,property,value] of [["Font size (px)","fontSize",42],["Line height","lineHeight",1.4],["Letter spacing (px)","letterSpacing",3]] as const){
  const input=page.getByRole("textbox",{name:label,exact:true});await input.fill(String(value));await input.press("Enter");await expect.poll(()=>effective(f.text)[property]).toBe(value);
 }
 await expect(canvas.locator(`[data-kcd-appearance-for="${f.text}"]`)).toHaveCSS("font-size","42px");
 await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(()=>effective(f.text).letterSpacing).toBe(key==="mobile"?0:2);
 await page.getByRole("button",{name:"Redo",exact:true}).first().click();await expect.poll(()=>effective(f.text).letterSpacing).toBe(3);
 await canvas.locator(`[data-kcd-node-id="${f.image}"]`).click();const focal=page.getByRole("textbox",{name:"Horizontal focal point (%)",exact:true});await focal.fill("75");await focal.press("Enter");await expect.poll(()=>effective(f.image).focalX).toBe(75);
 await expect(canvas.getByRole("img",{name:"Kebu test image",exact:true})).toHaveCSS("object-position",`75% ${key==="desktop"?50:key==="tablet"?80:10}%`);
 await page.reload();if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();await expect(canvas.locator(`[data-kcd-appearance-for="${f.text}"]`)).toHaveCSS("font-size","42px");
 await canvas.locator(`[data-kcd-node-id="${f.text}"]`).click();
 if(key!=="desktop"){
  await page.getByRole("button",{name:"Use desktop value for font size (px)",exact:true}).click();await expect.poll(()=>server.document().nodes[f.text].overrides[key]?.fontSize).toBeUndefined();await expect(canvas.locator(`[data-kcd-appearance-for="${f.text}"]`)).toHaveCSS("font-size","30px");
 }
 await labelledControls(page);expect(server.legacyWrites).toEqual([]);await page.screenshot({path:`evidence/3d/art-editor-${key}.png`,fullPage:true});
});

for(const device of ["Desktop","Tablet","Phone"] as const)test(`motion: ${device} controls, history, replay, reset, locks and reload`,async({page})=>{
 const f=motionFixture();delete f.doc.nodes[f.text].motion;delete f.doc.nodes[f.text].interaction;
 await page.setViewportSize({width:1440,height:1000});const server=await authority(page,false,f.doc),key=device==="Desktop"?"desktop":device==="Tablet"?"tablet":"mobile";
 const canvas=device==="Desktop"?page:page.frameLocator(`iframe[title="${key} preview"]`);
 await page.goto(`/create/${projectId}`);if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();
 await canvas.locator(`[data-kcd-node-id="${f.text}"]`).click();await page.locator("summary").filter({hasText:/^Motion$/}).click();
 await page.getByRole("combobox",{name:"Entrance animation",exact:true}).selectOption("rise");await expect.poll(()=>server.document().nodes[f.text].motion).toMatchObject({preset:"rise"});
 const input=page.getByRole("spinbutton",{name:"Duration (ms)",exact:true});await input.fill("1500");await input.press("Enter");await expect.poll(()=>server.document().nodes[f.text].motion).toMatchObject({duration:1500});
 await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(()=>server.document().nodes[f.text].motion).toMatchObject({duration:500});
 await page.getByRole("button",{name:"Redo",exact:true}).first().click();await expect.poll(()=>server.document().nodes[f.text].motion).toMatchObject({duration:1500});
 const host=canvas.locator(`[data-kcd-motion-for="${f.text}"]`);expect(await host.evaluate(e=>e.getAnimations().length)).toBe(0);
 const count=server.transactions.length;await page.getByRole("button",{name:"Replay animation",exact:true}).click();await expect.poll(()=>host.evaluate(e=>e.getAnimations().length)).toBe(1);expect(server.transactions).toHaveLength(count);
 await expect.poll(()=>host.evaluate(e=>e.getAnimations().length)).toBe(0);
 await page.getByRole("combobox",{name:"Hover and link focus",exact:true}).selectOption("lift");await expect.poll(()=>server.document().nodes[f.text].interaction).toMatchObject({effect:"lift"});
 await page.getByLabel(`Animate on ${key==="mobile"?"phone":key}`,{exact:true}).uncheck();await expect.poll(()=>server.document().nodes[f.text].motion).toMatchObject(key==="desktop"?{enabled:false}:{devices:{[key]:{enabled:false}}});
 await page.getByRole("button",{name:"Replay animation",exact:true}).click();await expect(page.getByRole("status").filter({hasText:"Enable animation on this device"})).toBeVisible();
 if(key!=="desktop"){await page.getByRole("button",{name:"Use desktop animation setting",exact:true}).click();await expect.poll(()=>server.document().nodes[f.text].motion).toMatchObject({devices:{}});}
 await page.reload();if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();await canvas.locator(`[data-kcd-node-id="${f.text}"]`).click();await page.locator("summary").filter({hasText:/^Motion$/}).click();await expect(page.getByRole("combobox",{name:"Entrance animation",exact:true})).toHaveValue("rise");
 await page.getByRole("button",{name:"Lock element",exact:true}).click();await expect(page.getByRole("combobox",{name:"Entrance animation",exact:true})).toBeDisabled();expect(server.legacyWrites).toEqual([]);
 await expect.poll(()=>server.document().nodes[f.text].locked).toBe(true);await page.getByRole("button",{name:"Unlock element",exact:true}).click();await expect.poll(()=>server.document().nodes[f.text].locked).toBe(false);await labelledControls(page);await page.locator("summary").filter({hasText:/^Motion$/}).scrollIntoViewIfNeeded();
 await page.screenshot({path:`evidence/3e/motion-editor-${key}.png`,fullPage:true});
});

test("motion: a conflicting save preserves the saved animation and pending draft",async({page})=>{
 const f=motionFixture(),server=await authority(page,"motion",f.doc);await page.setViewportSize({width:1440,height:1000});await page.goto(`/create/${projectId}`);await page.locator(`[data-kcd-node-id="${f.text}"]`).click();await page.locator("summary").filter({hasText:/^Motion$/}).click();await page.getByRole("combobox",{name:"Entrance animation",exact:true}).selectOption("zoom");
 await expect(page.getByText("Animation changed elsewhere",{exact:false}).first()).toBeVisible();expect(server.document().nodes[f.text].motion).toMatchObject({preset:"rise"});expect(server.transactions).toHaveLength(1);await expect(page.getByRole("combobox",{name:"Entrance animation",exact:true})).toHaveValue("zoom");await page.getByRole("button",{name:"Replay animation",exact:true}).click();expect(server.transactions).toHaveLength(1);
});

for(const device of ["Desktop","Tablet","Phone"] as const)test(`effects: ${device} save, history, reset, validation, locks and reload`,async({page})=>{
 const f=artDirectionFixture(),server=await authority(page,false,f.doc),key=device==="Desktop"?"desktop":device==="Tablet"?"tablet":"mobile";
 await page.setViewportSize({width:1440,height:1000});await page.goto(`/create/${projectId}`);if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();const canvas=device==="Desktop"?page:page.frameLocator(`iframe[title="${key} preview"]`);
 await canvas.locator(`[data-kcd-node-id="${f.image}"]`).click();await page.locator("summary").filter({hasText:/^Masks and effects$/}).click();
 const saved=()=>key==="desktop"?server.document().nodes[f.image].props:server.document().nodes[f.image].overrides[key]!;
 await page.getByRole("combobox",{name:"Mask shape",exact:true}).selectOption("arch");await expect.poll(()=>saved().mask).toBe("arch");await expect(canvas.locator(`[data-kcd-effects-for="${f.image}"]`)).toHaveCSS("clip-path","inset(0px round 50% 50% 0px 0px)");
 await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(()=>saved().mask).toBeUndefined();await page.getByRole("button",{name:"Redo",exact:true}).first().click();await expect.poll(()=>saved().mask).toBe("arch");
 const before=server.transactions.length;await page.getByLabel("Blur (px)",{exact:true}).fill("99");await page.getByLabel("Blur (px)",{exact:true}).press("Enter");await expect(page.getByRole("alert").filter({hasText:"Choose a valid value for blur"})).toBeVisible();expect(server.transactions).toHaveLength(before);
 await page.getByLabel("Blur (px)",{exact:true}).fill("2");await page.getByLabel("Blur (px)",{exact:true}).press("Enter");await expect.poll(()=>saved().blur).toBe(2);
 await page.reload();if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();await canvas.locator(`[data-kcd-node-id="${f.image}"]`).click();await page.locator("summary").filter({hasText:/^Masks and effects$/}).click();await expect(page.getByRole("combobox",{name:"Mask shape",exact:true})).toHaveValue("arch");
 await page.getByRole("button",{name:key==="desktop"?"Use type default for mask shape":"Use desktop value for mask shape",exact:true}).click();await expect.poll(()=>saved().mask).toBeUndefined();
 await page.getByRole("button",{name:"Lock element",exact:true}).click();await expect(page.getByRole("combobox",{name:"Mask shape",exact:true})).toBeDisabled();await expect.poll(()=>server.document().nodes[f.image].locked).toBe(true);await page.getByRole("button",{name:"Unlock element",exact:true}).click();await expect.poll(()=>server.document().nodes[f.image].locked).toBe(false);await labelledControls(page);expect(server.legacyWrites).toEqual([]);await page.locator("summary").filter({hasText:/^Masks and effects$/}).scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/3f/effects-editor-${key}.png`,fullPage:true});
});

for(const device of ["Desktop","Tablet","Phone"] as const)test(`rich: ${device} selected formatting, text editing, history, reload and links`,async({page})=>{
 const f=artDirectionFixture();delete f.doc.nodes[f.text].props.href;const server=await authority(page,false,f.doc),key=device==="Desktop"?"desktop":device==="Tablet"?"tablet":"mobile";
 await page.setViewportSize({width:1440,height:1000});await page.goto(`/create/${projectId}`);if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();const canvas=device==="Desktop"?page:page.frameLocator(`iframe[title="${key} preview"]`);await canvas.locator(`[data-kcd-node-id="${f.text}"]`).click();
 const field=page.getByRole("textbox",{name:"Text",exact:true}),saved=()=>key==="desktop"?server.document().nodes[f.text].props:server.document().nodes[f.text].overrides[key]!;
 const select=async()=>{await field.focus();await field.press("Control+Home");for(let i=0;i<6;i++)await field.press("Shift+ArrowRight");};
 await select();await page.getByRole("button",{name:"Bold",exact:true}).click();await expect.poll(()=>(saved().runs as {bold?:boolean}[]|undefined)?.[0]).toMatchObject({bold:true});await expect(canvas.locator(`[data-kcd-appearance-for="${f.text}"] strong`)).toBeVisible();
 await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(()=>saved().runs).toBeUndefined();await page.getByRole("button",{name:"Redo",exact:true}).first().click();await expect.poll(()=>(saved().runs as {bold?:boolean}[]|undefined)?.[0]).toMatchObject({bold:true});
 const original=await field.inputValue();await field.fill(original+" extended");await field.press("Tab");await expect.poll(()=>saved().text).toBe(original+" extended");await expect.poll(()=>(saved().runs as {bold?:boolean}[]|undefined)?.[0]).toMatchObject({bold:true});
 await select();await page.getByLabel("Selected text link",{exact:true}).fill("javascript:alert(1)");const before=server.transactions.length;await page.getByRole("button",{name:"Apply link to selection",exact:true}).click();await expect(page.getByRole("alert").filter({hasText:"Choose a valid link"})).toBeVisible();expect(server.transactions).toHaveLength(before);
 await page.getByLabel("Selected text link",{exact:true}).fill("contact");await page.getByRole("button",{name:"Apply link to selection",exact:true}).click();await expect.poll(()=>(saved().runs as {href?:string}[]|undefined)?.[0]).toMatchObject({href:"contact"});
 await page.reload();if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();await canvas.locator(`[data-kcd-node-id="${f.text}"]`).click();await expect(field).toHaveValue(original+" extended");await expect(canvas.locator(`[data-kcd-appearance-for="${f.text}"] strong`)).toBeVisible();await labelledControls(page);expect(server.legacyWrites).toEqual([]);await field.scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/3f/rich-editor-${key}.png`,fullPage:true});
 await field.fill("");await field.press("Tab");await expect.poll(()=>saved().text).toBe("");if(key!=="desktop")await expect.poll(()=>saved().runs).toEqual([]);
 await field.fill("Fresh device copy");await field.press("Tab");await expect.poll(()=>saved().text).toBe("Fresh device copy");if(key!=="desktop")await expect.poll(()=>saved().runs).toEqual([{text:"Fresh device copy"}]);await expect(canvas.locator(`[data-kcd-appearance-for="${f.text}"]`)).toContainText("Fresh device copy");
});

for(const device of ["Desktop","Tablet","Phone"] as const)test(`video: ${device} media choice, independent poster, history, reload and locks`,async({page})=>{
 const f=videoFixture();f.doc.nodes[f.video].props.src="";const server=await authority(page,false,f.doc),key=device==="Desktop"?"desktop":device==="Tablet"?"tablet":"mobile";
 await page.route(`**/api/projects/${projectId}/assets`,route=>route.fulfill({json:{assets:[{id:"movie",url:"/qa-video.webm",kind:"video",file_name:"Campaign video",created_at:new Date().toISOString()}]}}));
 await page.setViewportSize({width:1440,height:1000});await page.goto(`/create/${projectId}`);if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();const canvas=device==="Desktop"?page:page.frameLocator(`iframe[title="${key} preview"]`);await canvas.locator(`[data-kcd-node-id="${f.video}"]`).click();
 const saved=()=>key==="desktop"?server.document().nodes[f.video].props:server.document().nodes[f.video].overrides[key]!;
 await page.getByRole("button",{name:"Choose video from media library",exact:true}).click();await page.getByRole("button",{name:"Add",exact:true}).click();await expect.poll(()=>saved().src).toBe("/qa-video.webm");await expect(canvas.locator("video")).toHaveAttribute("preload","none");
 await page.getByRole("textbox",{name:"Poster image",exact:true}).fill("/brand/kebu-mark.png?poster=changed");await page.getByRole("textbox",{name:"Poster image",exact:true}).press("Tab");await expect.poll(()=>saved().poster).toBe("/brand/kebu-mark.png?poster=changed");await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(()=>saved().poster).toBe(key==="tablet"?"/brand/favicon.png":key==="desktop"?"/brand/kebu-mark.png":undefined);await page.getByRole("button",{name:"Redo",exact:true}).first().click();await expect.poll(()=>saved().poster).toBe("/brand/kebu-mark.png?poster=changed");
 await page.reload();if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();await canvas.locator(`[data-kcd-node-id="${f.video}"]`).click();await expect(page.getByRole("textbox",{name:"Video address",exact:true})).toHaveValue("/qa-video.webm");await page.getByRole("button",{name:"Lock element",exact:true}).click();await expect(page.getByRole("textbox",{name:"Video address",exact:true})).toBeDisabled();await labelledControls(page);expect(server.legacyWrites).toEqual([]);await page.screenshot({path:`evidence/3f/video-editor-${key}.png`,fullPage:true});
});

for(const family of ["hero","editorial-hero","split","text","image","gallery","video"])for(const device of ["Desktop","Phone"] as const)test(`decompose: ${family} ${device} conversion, child editing, inverse and reload`,async({page})=>{
 const f=decompositionFixture(family),server=await authority(page,false,f.doc);await page.setViewportSize({width:1440,height:1000});await page.goto(`/create/${projectId}`);if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();const canvas=device==="Desktop"?page:page.frameLocator('iframe[title="mobile preview"]');
 await canvas.locator(`[data-section-id="${f.root}"]`).click({position:{x:12,y:12}});await page.getByRole("button",{name:"Review section conversion",exact:true}).click();await page.getByRole("button",{name:"Cancel conversion",exact:true}).click();expect(server.transactions).toHaveLength(0);await page.getByRole("button",{name:"Review section conversion",exact:true}).click();await page.getByRole("button",{name:"Convert to editable elements",exact:true}).click();await expect.poll(()=>server.document().nodes[f.root].type).toBe("section");expect(server.transactions).toHaveLength(1);await expect(canvas.locator(`[data-kcd-node-id="${f.root}"]`)).toHaveCount(1);
 const native=server.document(),child=Object.values(native.nodes).find(n=>n.type==="text"&&n.props.text)!;
 await canvas.locator(`[data-kcd-node-id="${child.id}"]`).click();const field=page.getByRole("textbox",{name:"Text",exact:true}),value=await field.inputValue();await field.fill(value+" edited");await field.press("Tab");await expect.poll(()=>device==="Desktop"?server.document().nodes[child.id].props.text:server.document().nodes[child.id].overrides.mobile?.text).toBe(value+" edited");
 await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(()=>device==="Desktop"?server.document().nodes[child.id].props.text:server.document().nodes[child.id].overrides.mobile?.text).not.toBe(value+" edited");await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(()=>server.document().nodes[f.root].type).toBe(`legacy-section:${family}`);await page.getByRole("button",{name:"Redo",exact:true}).first().click();await expect.poll(()=>server.document().nodes[f.root].type).toBe("section");
 await page.reload();if(device!=="Desktop")await page.getByRole("button",{name:device,exact:true}).first().click();await expect(canvas.locator(`[data-kcd-node-id="${f.root}"]`)).toHaveCount(1);expect(server.document().pages[0].deviceLayout.mobile?.order).toEqual([f.root]);expect(server.legacyWrites).toEqual([]);await page.screenshot({path:`evidence/3g/converted-${family}-${device.toLowerCase()}.png`,fullPage:true});
});

test("decompose: unsupported legacy settings preserve the original without a transaction",async({page})=>{
 const f=decompositionFixture();f.doc.nodes[f.root].motion={preset:"legacy"};const server=await authority(page,false,f.doc);await page.goto(`/create/${projectId}`);await page.locator(`[data-section-id="${f.root}"]`).click({position:{x:12,y:12}});await page.getByRole("button",{name:"Review section conversion",exact:true}).click();await page.getByRole("button",{name:"Convert to editable elements",exact:true}).click();await expect(page.getByRole("alert").filter({hasText:"legacy effects or connected data"})).toBeVisible();expect(server.transactions).toHaveLength(0);expect(server.document().nodes[f.root].type).toBe("legacy-section:editorial-hero");
});
