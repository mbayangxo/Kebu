import { test, expect, type Page } from "playwright/test";
import { newBrandBrain } from "../../lib/create/brand-brain";
import { documentToRows } from "../../lib/create/kcd-adapter";
import { prepareBuilderTransaction } from "../../lib/create/kcd-write-boundary";
import type { NodeId, Transaction } from "../../lib/creative-core";
import { artDirectionFixture } from "./fixtures/art-direction";
test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1", "Controlled local authority, not signed-in hosted QA.");
const projectId = "11111111-1111-4111-8111-111111111111";
async function authority(page: Page) {
  const f = artDirectionFixture(); let document = f.doc;
  const profile = newBrandBrain(); profile.brand.name = "Controlled saved direction"; profile.brand.primaryColor = "#234567"; profile.motion.enabled = true; profile.motion.entrance = "rise";
  const record = { id: "22222222-2222-4222-8222-222222222222", revision: 1, profile };
  const transactions: Transaction[] = []; let fail = false, empty = false;
  let binding={projectId,profileId:null as string|null,revision:0};
  await page.route("**/api/**", async route => {
    const req = route.request(), url = new URL(req.url()); const reply = (json: unknown, status = 200) => route.fulfill({ json, status });
    if (url.pathname === "/api/studio/brand-brain") return fail ? reply({ error: "Profile loading failed. Retry." }, 503) : reply({ profiles: empty ? [] : [record] });
    if(url.pathname===`/api/projects/${projectId}/brand-brain`){if(req.method()==="GET")return reply({binding,record:binding.profileId?record:null,unavailable:false});const body=req.postDataJSON();expect(body.expectedRevision).toBe(binding.revision);binding={...binding,profileId:body.profileId,revision:binding.revision+1};return reply({binding});}
    if (url.pathname === `/api/projects/${projectId}`) { const rows = documentToRows(document); return reply({ ...rows, project: { ...rows.project, subdomain: "brand-brain-fixture", status: "draft" }, renderPath: "kcd", publishState: { isLive: false, hasUnpublishedChanges: false, lastPublishedAt: null }, siteChrome: { enabled: false } }); }
    if (url.pathname.endsWith("/operations")) {
      if (req.method() === "GET") return reply({ document });
      const tx = req.postDataJSON() as Transaction; const result = prepareBuilderTransaction(document, tx); if (!result.ok) return reply({ error: result.error.message }, 400);
      transactions.push(tx); document = result.prediction.document;
      return reply({ status: "committed", versions: result.prediction.versions, removed: result.prediction.removed, nodes: Object.keys(result.prediction.versions).flatMap(id => document.nodes[id as NodeId] ? [document.nodes[id as NodeId]] : []) });
    }
    if (url.pathname.endsWith("/billing")) return reply({ canPublish: true, billingExempt: true });
    if (url.pathname.endsWith("/site-chrome")) return reply({ siteChrome: { enabled: false } });
    return reply({});
  });
  return { f, record, transactions, document: () => document, fail: (value: boolean) => { fail = value; }, empty: () => { empty = true; } };
}
async function open(page: Page, text: string, width = 1440) {
  await page.setViewportSize({ width, height: 1000 }); await page.goto(`/create/${projectId}`);
  await page.locator(`[data-kcd-node-id="${text}"]`).click();
  await page.locator("summary").filter({ hasText: "Brand Brain · saved direction" }).click();
}
for (const width of [1440, 390]) test(`Brand Brain ${width}px applies one edit, undo, redo and reload`, async ({ page }) => {
  const server = await authority(page), errors: string[] = []; page.on("pageerror", error => errors.push(error.message)); await open(page, server.f.text, width);
  const panel = page.getByRole("region", { name: "Apply Brand Brain" }); await panel.getByRole("combobox", { name: "Saved Brand Brain" }).selectOption(server.record.id);
  await panel.getByRole("checkbox", { name: "Apply motion direction" }).check(); await panel.getByRole("button", { name: "Apply to selected subtree" }).click();
  await expect.poll(() => server.document().nodes[server.f.text].props.color).toBe("#234567"); await expect.poll(() => server.document().nodes[server.f.text].motion).toMatchObject({ preset: "rise" }); expect(server.transactions).toHaveLength(1);
  await expect(page.locator(`[data-kcd-appearance-for="${server.f.text}"]`).filter({ visible: true }).first()).toHaveCSS("color", "rgb(35, 69, 103)");
  if (width < 640) await page.getByRole("button", { name: "Done — view site", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).first().click(); await expect.poll(() => server.document().nodes[server.f.text].props.color).toBeUndefined();
  await page.getByRole("button", { name: "Redo", exact: true }).first().click(); await expect.poll(() => server.document().nodes[server.f.text].props.color).toBe("#234567");
  if (width < 640) await page.getByRole("button", { name: "Build", exact: true }).first().click();
  await panel.getByRole("button", { name: "Apply to selected subtree" }).click(); await expect(panel.getByRole("status")).toContainText("already matches"); expect(server.transactions).toHaveLength(3);
  await page.reload(); await page.locator(`[data-kcd-node-id="${server.f.text}"]`).click(); await page.locator("summary").filter({ hasText: "Brand Brain · saved direction" }).click();
  await expect(panel.getByRole("combobox", { name: "Saved Brand Brain" })).toHaveValue(server.record.id); expect(server.document().nodes[server.f.text].overrides).toEqual(server.f.doc.nodes[server.f.text].overrides);
  await expect.poll(() => panel.locator("input,select").evaluateAll(fields => fields.filter(field => !(field as HTMLInputElement).labels?.length).length)).toBe(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); expect(errors).toEqual([]);
  await panel.scrollIntoViewIfNeeded(); await page.screenshot({ path: `evidence/3h/application/editor-${width}.png`, fullPage: true });
});
test("profile failures and stale versions do not write the draft", async ({ page }) => {
  const server = await authority(page); server.fail(true); await open(page, server.f.text);
  const panel = page.getByRole("region", { name: "Apply Brand Brain" }); await expect(panel.getByRole("alert")).toContainText("loading failed"); server.fail(false); await panel.getByRole("button", { name: "Reload profiles" }).click();
  await panel.getByRole("combobox", { name: "Saved Brand Brain" }).selectOption(server.record.id); server.record.revision++;
  await panel.getByRole("button", { name: "Apply to selected subtree" }).click(); await expect(panel.getByRole("alert")).toContainText("profile changed"); expect(server.transactions).toHaveLength(0);
  await expect(panel.getByRole("combobox")).toContainText("v2"); server.fail(true); await panel.getByRole("button", { name: "Apply to selected subtree" }).click(); await expect(panel.getByRole("alert")).toContainText("loading failed"); expect(server.transactions).toHaveLength(0);
});
test("empty profiles offer authoring without a fake apply control", async ({ page }) => {
  const server = await authority(page); server.empty(); await open(page, server.f.text); const panel = page.getByRole("region", { name: "Apply Brand Brain" });
  await expect(panel.getByRole("link", { name: "Create Brand Brain" })).toHaveAttribute("href", "/studio/brand"); await expect(panel.getByRole("button", { name: "Apply to selected subtree" })).toHaveCount(0);
});
test("incompatible profile responses show recovery and cannot apply", async ({ page }) => {
  const server = await authority(page);
  await page.route("**/api/studio/brand-brain", route => route.fulfill({ json: { profiles: [{ ...server.record, profile: { ...server.record.profile, version: 99 } }] } }));
  await open(page, server.f.text); const panel = page.getByRole("region", { name: "Apply Brand Brain" });
  await expect(panel.getByRole("alert")).toHaveText("Saved profile data is incompatible. Reload profiles or review Brand Brain.");
  await expect(panel.getByRole("button", { name: "Reload profiles" })).toBeEnabled(); await expect(panel.getByRole("button", { name: "Apply to selected subtree" })).toHaveCount(0); expect(server.transactions).toHaveLength(0);
});
