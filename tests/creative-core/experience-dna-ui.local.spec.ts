import { test, expect, type Page } from "playwright/test";
import { mkdirSync } from "node:fs";
import type { ExperienceDna } from "../../lib/create/experience-dna";
import { documentToRows } from "../../lib/create/kcd-adapter";
import { artDirectionFixture } from "./fixtures/art-direction";
test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1", "Controlled local API, not hosted signed-in QA.");
const projectId = "11111111-1111-4111-8111-111111111111";
async function authority(page: Page) {
  const f = artDirectionFixture(); let record = { projectId, revision: 0, dna: null as ExperienceDna | null };
  let failure: "conflict" | "uncertain" | "ack" | "read" | null = null, reads = 0, writes = 0, operations = 0;
  await page.route("**/api/**", async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    const reply = (json: unknown, status = 200) => route.fulfill({ json, status });
    if (path.endsWith("/experience-dna")) {
      if (req.method() === "GET") { reads++; return failure === "read" ? reply({ error: "Direction storage unavailable. Retry." }, 503) : reply({ record }); }
      writes++; const input = req.postDataJSON(); expect(input.expectedRevision).toBe(record.revision);
      if (failure === "conflict") return reply({ error: "Direction changed elsewhere. Reload before retrying." }, 409);
      if (failure === "uncertain") return route.abort();
      record = { projectId, revision: record.revision + 1, dna: input.dna };
      return reply({ record: failure === "ack" ? { ...record, revision: record.revision + 1 } : record });
    }
    if (path === `/api/projects/${projectId}`) { const rows = documentToRows(f.doc); return reply({ ...rows, project: { ...rows.project, subdomain: "experience-fixture", status: "draft" }, renderPath: "kcd", publishState: { isLive: false, hasUnpublishedChanges: false, lastPublishedAt: null }, siteChrome: { enabled: false } }); }
    if (path.endsWith("/operations")) { if (req.method() === "GET") return reply({ document: f.doc }); operations++; return reply({ error: "Unexpected site edit" }, 500); }
    if (path.endsWith("/experience-engine")) return reply({ configured: false, proposals: [] });
    if (path.endsWith("/billing")) return reply({ canPublish: true, billingExempt: true });
    if (path.endsWith("/site-chrome")) return reply({ siteChrome: { enabled: false } });
    return reply({});
  });
  return { f, record: () => record, failure: (value: typeof failure) => { failure = value; }, reads: () => reads, writes: () => writes, operations: () => operations };
}
async function open(page: Page, textId: string, width = 1440) {
  await page.setViewportSize({ width, height: 1000 }); await page.goto(`/create/${projectId}`);
  await page.locator(`[data-kcd-node-id="${textId}"]`).click();
  await page.locator("summary").filter({ hasText: "Site direction · Experience DNA" }).click();
  const panel = page.getByRole("region", { name: "Site direction", exact: true }); await expect(panel.getByLabel("Site goal", { exact: true })).toBeVisible(); return panel;
}
async function brief(panel: ReturnType<Page["getByRole"]>) {
  await panel.getByLabel("Site goal", { exact: true }).fill("Book a photography session"); await panel.getByLabel("Audience", { exact: true }).fill("Artists in Dakar");
  await panel.getByLabel("Main visitor action", { exact: true }).fill("Request a booking"); await panel.getByLabel("Desired experience", { exact: true }).fill("Expressive editorial photography with clear bookings");
  await panel.locator("summary").filter({ hasText: "Desired pages" }).click(); await panel.getByLabel("Desired page 1 purpose").fill("Introduce the work and booking path");
}
for (const width of [1440, 390]) test(`Experience DNA ${width}px saves reference/page intent, reloads and keeps site unchanged`, async ({ page }) => {
  const server = await authority(page), errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const panel = await open(page, server.f.text, width); await brief(panel);
  await panel.locator("summary").filter({ hasText: "Reference observations" }).click(); await panel.getByRole("button", { name: "Add reference observation", exact: true }).click();
  await panel.getByLabel("Reference 1 label").fill("Editorial opening"); await panel.getByLabel("Reference 1 address").fill("https://example.com/work"); await panel.getByLabel("Reference 1 observations").fill("Large first photograph, quieter captions");
  await panel.getByRole("button", { name: "Add desired page", exact: true }).click(); await panel.getByLabel("Desired page 2 title").fill("Work"); await panel.getByLabel("Desired page 2 address").fill("work"); await panel.getByLabel("Desired page 2 purpose").fill("Selected photography");
  await panel.getByRole("button", { name: "Move desired page 2 up" }).click();
  await panel.getByRole("button", { name: "Save site direction", exact: true }).click(); await expect(panel.getByText(/Site direction saved · v1/)).toBeVisible();
  expect(server.record().dna?.pages.map(page => page.slug)).toEqual(["work", "home"]); expect(server.record().dna?.references[0].observations).toContain("quieter captions"); expect(server.operations()).toBe(0);
  await page.reload(); await page.locator(`[data-kcd-node-id="${server.f.text}"]`).click(); await page.locator("summary").filter({ hasText: "Site direction · Experience DNA" }).click();
  await expect(panel.getByLabel("Site goal", { exact: true })).toHaveValue("Book a photography session"); await panel.locator("summary").filter({ hasText: "Reference observations" }).click(); await panel.locator("summary").filter({ hasText: "Desired pages" }).click();
  await expect(panel.getByLabel("Desired page 1 title")).toHaveValue("Work"); await expect(panel.getByLabel("Reference 1 label")).toHaveValue("Editorial opening");
  mkdirSync("evidence/3i/experience", { recursive: true }); await panel.screenshot({ path: `evidence/3i/experience/direction-${width}.png` });
  await panel.evaluate(element => { const inspector = element.closest("aside"); if (!inspector) throw new Error("Missing inspector"); inspector.scrollTop = 0; });
  await page.screenshot({ path: `evidence/3i/experience/direction-overview-${width}.png`, fullPage: true });
  expect(await panel.locator("input,textarea").evaluateAll(fields => fields.every(field => (field as HTMLInputElement).labels?.length))).toBe(true);
  expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true); expect(errors).toEqual([]);
});
test("Experience DNA retains drafts on close, element selection and cancelled discard; invalid input never writes", async ({ page }) => {
  const server = await authority(page), panel = await open(page, server.f.text); await brief(panel);
  await page.locator("summary").filter({ hasText: "Site direction · Experience DNA" }).click(); await page.locator("summary").filter({ hasText: "Site direction · Experience DNA" }).click();
  await page.getByRole("button", { name: "Show element hierarchy", exact: true }).click(); await page.locator(`[data-kcd-node-id="${server.f.image}"]`).click();
  await expect(panel.getByLabel("Audience", { exact: true })).toHaveValue("Artists in Dakar"); expect(server.reads()).toBe(1);
  await page.getByRole("button", { name: "Assets", exact: true }).click(); await page.getByRole("button", { name: "Build", exact: true }).first().click();
  await expect(panel.getByLabel("Audience", { exact: true })).toHaveValue("Artists in Dakar"); expect(server.reads()).toBe(1);
  page.once("dialog", dialog => dialog.dismiss()); await page.getByRole("link", { name: "Preview", exact: true }).click(); await expect(page).toHaveURL(`/create/${projectId}`);
  page.once("dialog", dialog => dialog.dismiss()); await panel.getByRole("button", { name: "Reload site direction", exact: true }).click(); await expect(panel.getByLabel("Audience", { exact: true })).toHaveValue("Artists in Dakar");
  await panel.getByLabel("Site goal", { exact: true }).fill(""); await panel.getByRole("button", { name: "Save site direction", exact: true }).click(); await expect(panel.getByRole("alert")).toContainText("goal"); expect(server.writes()).toBe(0);
  page.once("dialog", dialog => dialog.accept()); await panel.getByRole("button", { name: "Reload site direction", exact: true }).click(); await expect(panel.getByLabel("Audience", { exact: true })).toHaveValue("");
});
for (const failure of ["conflict", "uncertain", "ack"] as const) test(`Experience DNA ${failure} retains draft, blocks repeat writes and recovers via authoritative reload`, async ({ page }) => {
  const server = await authority(page), panel = await open(page, server.f.text); await brief(panel); server.failure(failure);
  await panel.getByRole("button", { name: "Save site direction", exact: true }).click(); await expect(panel.getByRole("alert")).toBeVisible(); await expect(panel.getByRole("button", { name: "Save site direction", exact: true })).toBeDisabled();
  await expect(panel.getByLabel("Audience", { exact: true })).toHaveValue("Artists in Dakar"); expect(server.writes()).toBe(1);
  server.failure(null); page.once("dialog", dialog => dialog.accept()); await panel.getByRole("button", { name: "Reload site direction", exact: true }).click();
  await expect(panel.getByText("Save unconfirmed · reload required")).toHaveCount(0); expect(server.operations()).toBe(0);
});
test("Experience DNA read failure is honest and can recover without empty saved claims", async ({ page }) => {
  const server = await authority(page); server.failure("read"); await page.goto(`/create/${projectId}`); await page.locator(`[data-kcd-node-id="${server.f.text}"]`).click(); await page.locator("summary").filter({ hasText: "Site direction · Experience DNA" }).click();
  const panel = page.getByRole("region", { name: "Site direction", exact: true }); await expect(panel.getByRole("alert")).toContainText("storage unavailable"); await expect(panel.getByRole("button", { name: "Save site direction", exact: true })).toBeDisabled();
  server.failure(null); await panel.getByRole("button", { name: "Reload site direction", exact: true }).click(); await expect(panel.getByLabel("Site goal", { exact: true })).toBeVisible(); expect(server.writes()).toBe(0);
});

test("appearance covers both direction panels without changing the draft or site colors",async({page})=>{
 const server=await authority(page),panel=await open(page,server.f.text);await brief(panel);
 const canvas=page.locator(`[data-kcd-node-id="${server.f.text}"]`);
 const originalColor=await canvas.evaluate(element=>getComputedStyle(element).color);
 await page.locator("summary").filter({hasText:"Yande · experience engine"}).click();
 const engine=page.getByRole("region",{name:"Experience engine",exact:true});
 for(const [appearance,background,color] of [["dark","rgb(28, 30, 34)","rgb(245, 245, 247)"],["light","rgb(255, 255, 255)","rgb(10, 10, 10)"]] as const){
  await page.getByRole("combobox",{name:"Builder appearance",exact:true}).selectOption(appearance);
  await expect(panel.locator("..")).toHaveCSS("background-color",background);
  await expect(engine.locator("..")).toHaveCSS("background-color",background);
  await expect(engine.locator("..")).toHaveCSS("color-scheme",appearance);
  await expect(panel.getByLabel("Audience",{exact:true})).toHaveCSS("color",color);
  await expect(panel.getByLabel("Audience",{exact:true})).toHaveValue("Artists in Dakar");
  await expect(canvas).toHaveCSS("color",originalColor);
  await page.screenshot({path:test.info().outputPath(`direction-${appearance}.png`),fullPage:true});
 }
 expect(server.writes()).toBe(0);expect(server.operations()).toBe(0);expect(server.reads()).toBe(1);
});
