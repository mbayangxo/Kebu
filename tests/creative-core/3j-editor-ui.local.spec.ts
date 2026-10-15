import { test, expect, type Page } from "playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { open3jDatabase, projectId, owner } from "./fixtures/3j-database";
import { documentToRows } from "../../lib/create/kcd-adapter";
import type { Transaction, NodeId } from "../../lib/creative-core";

test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1" || !process.env.KEBU_LOCAL_PGLITE_ROOT, "Actual migrated local PostgreSQL bridge; hosted authentication remains separate.");
async function bridge(page: Page) {
  const server = await open3jDatabase();
  await server.apply((await server.proposal()).transaction);
  await server.queryAs("authenticated",owner,"update projects set subdomain=$1 where id=$2",["maylecor-3j",projectId]);
  const transactions: Transaction[] = [], legacyWrites: string[] = [];
  let truncateNext = false;
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === `/api/projects/${projectId}`) {
      const rows = documentToRows(await server.read());
      const saved=(await server.queryAs<{status:string;subdomain:string;published_at:string|null}>("authenticated",owner,"select status,subdomain,published_at from projects where id=$1",[projectId])).rows[0];
      return route.fulfill({ json: { ...rows, project: { ...rows.project, ...saved }, renderPath: "kcd", siteChrome: { enabled: false }, publishState: { isLive: saved.status === "published", hasUnpublishedChanges: false, lastPublishedAt: saved.published_at } } });
    }
    if (path.endsWith("/operations")) {
      if (request.method() === "GET") return route.fulfill({ json: { document: await server.read() } });
      const tx = request.postDataJSON() as Transaction; transactions.push(tx);
      try { const acknowledgement = await server.apply(tx); if (truncateNext) { truncateNext = false; return await route.fulfill({ json: { status: "committed" } }); } return await route.fulfill({ json: acknowledgement }); }
      catch (error) { return route.fulfill({ status: 409, json: { error: error instanceof Error ? error.message : "Database operation failed" } }); }
    }
    if (path.endsWith("/settings") && request.method() === "PATCH") {
      const body=request.postDataJSON();
      const saved=await server.queryAs("authenticated",owner,"update projects set seo=$1,subdomain=$2 where id=$3 and owner_id=$4 returning id,subdomain",[body.seo,body.subdomain,projectId,owner]);
      return route.fulfill({json:{project:saved.rows[0]}});
    }
    if (path.endsWith("/publish") && request.method() === "POST") {
      const published = await server.publish();
      writeFileSync(process.env.KEBU_LOCAL_S7_SNAPSHOT_FILE!, JSON.stringify(published));
      return route.fulfill({ json: { deployment: { status:"live",subdomain:"maylecor-3j",public_path:"/sites/maylecor-3j" }, liveUrl: "/s7-local-probe/home" } });
    }
    if (/\/sections(?:\/|$)/.test(path) && request.method() !== "GET") { legacyWrites.push(path); return route.fulfill({ status: 500, json: { error: "Unexpected legacy write" } }); }
    if (path.endsWith("/billing")) return route.fulfill({ json: { canPublish: true, billingExempt: true } });
    if (path.endsWith("/site-chrome")) return route.fulfill({ json: { siteChrome: { enabled: false } } });
    if (path.endsWith("/experience-engine")) return route.fulfill({ json: { configured: false, proposals: [] } });
    return route.fulfill({ json: {} });
  });
  return { server, transactions, legacyWrites, truncateNext: () => { truncateNext = true; } };
}
test("May Lècor committed reply recovery retries once without a second database version", async ({ page }) => {
  const authority = await bridge(page), { server } = authority;
  try {
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(`/create/${projectId}`);
    const heading = Object.values(server.current().nodes).find(node => node.props.text === "May Lècor")!, version = heading.version;
    await page.locator(`[data-kcd-node-id="${heading.id}"]`).scrollIntoViewIfNeeded();
    await page.locator(`[data-kcd-node-id="${heading.id}"]`).click(); authority.truncateNext();
    await page.getByRole("textbox", { name: "Text", exact: true }).fill("May Lècor — confirmed recovery");
    await page.getByRole("combobox", { name: "Text style", exact: true }).focus();
    await expect(page.getByText(/acknowledgement/i).first()).toBeVisible();
    await page.getByRole("button", { name: "Save draft", exact: true }).first().click();
    await expect.poll(() => authority.transactions.length).toBe(2);
    expect(authority.transactions[1]).toEqual(authority.transactions[0]);
    expect(server.current().nodes[heading.id].version).toBe(version + 1);
    await expect(page.getByText("Draft saved", { exact: true }).first()).toBeVisible();
    await page.reload(); await expect(page.getByRole("heading", { name: "May Lècor — confirmed recovery", exact: true })).toBeVisible();
  } finally { await server.close(); }
});
for (const [device, width] of [["Desktop", 1440], ["Tablet", 768], ["Phone", 390]] as const) {
  test(`May Lècor ${device}: native inspector → PostgreSQL → history → reload → publish`, async ({ page, browser, baseURL }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 1000 });
    const authority = await bridge(page), { server } = authority, errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      const key = device === "Desktop" ? "desktop" : device === "Tablet" ? "tablet" : "mobile";
      const canvas = device === "Desktop" ? page : page.frameLocator(`iframe[title="${key} preview"]`);
      const heading = Object.values(server.current().nodes).find(node => node.props.text === "May Lècor")!, figure = Object.values(server.current().nodes).find(node => node.props.position === "absolute" && node.a11y?.alt === "May Lècor figure")!;
      const effective = (id: NodeId) => ({ ...server.current().nodes[id].props, ...(key === "desktop" ? {} : server.current().nodes[id].overrides[key]) });
      const closePanel = async () => { const done = page.getByRole("button", { name: "Done — view site", exact: true }); if (await done.isVisible()) await done.click(); };
      await page.goto(`/create/${projectId}`); await closePanel();
      if (device !== "Desktop") await page.getByRole("button", { name: device, exact: true }).first().click();
      await canvas.locator(`[data-kcd-node-id="${heading.id}"]`).click();
      const text = "May Lècor — selected work";
      await page.getByRole("textbox", { name: "Text", exact: true }).fill(text);
      await page.getByRole("combobox", { name: "Text style", exact: true }).focus();
      await expect.poll(() => effective(heading.id).text).toBe(text);
      const size = page.getByRole("textbox", { name: "Font size (px)", exact: true });
      await size.fill("42"); await size.press("Enter");
      await expect.poll(() => effective(heading.id).fontSize).toBe(42);
      await closePanel(); await canvas.locator(`[data-kcd-node-id="${figure.id}"]`).click();
      const previousX = effective(figure.id).x as number, nextX = previousX - 10;
      const x = page.getByRole("textbox", { name: "Horizontal position (px)", exact: true });
      await x.fill(String(nextX)); await x.press("Enter");
      await expect.poll(() => effective(figure.id).x).toBe(nextX);
      await closePanel();
      await page.getByRole("button", { name: "Undo", exact: true }).first().click();
      await expect.poll(() => effective(figure.id).x).toBe(previousX);
      await page.getByRole("button", { name: "Redo", exact: true }).first().click();
      await expect.poll(() => effective(figure.id).x).toBe(nextX);
      await page.reload(); await closePanel();
      if (device !== "Desktop") await page.getByRole("button", { name: device, exact: true }).first().click();
      await expect(canvas.getByRole("heading", { name: text, exact: true })).toHaveCSS("font-size", "42px");
      expect(effective(figure.id).x).toBe(nextX);
      if (key !== "desktop") { expect(server.current().nodes[heading.id].props.text).toBe("May Lècor"); expect(server.current().nodes[heading.id].props.fontSize).toBe(64); expect(server.current().nodes[figure.id].props.x).toBe(650); }
      mkdirSync("evidence/3j", { recursive: true });
      await page.screenshot({ path: `evidence/3j/editor-${key}.png`, fullPage: true });
      await page.getByRole("button",{name:"Publish",exact:true}).click();
      await expect(page.getByRole("button",{name:"Published ✓",exact:true})).toBeVisible();
      const live=await server.queryAs<{count:number}>("postgres",owner,"select count(*)::int as count from deployments where project_id=$1 and status='live'",[projectId]);
      expect(live.rows[0].count).toBe(1);
      const context = await browser.newContext({ baseURL, viewport: { width, height: 1000 }, extraHTTPHeaders: { "x-kebu-is-public-site": "1" } });
      try { const publicPage = await context.newPage(); await publicPage.goto("/s7-local-probe/home"); await expect(publicPage.getByRole("heading", { name: text, exact: true })).toHaveCSS("font-size", "42px"); await publicPage.screenshot({ path: `evidence/3j/editor-published-${key}.png`, fullPage: true }); }
      finally { await context.close(); }
      expect(authority.transactions).toHaveLength(5); expect(authority.legacyWrites).toEqual([]); expect(errors).toEqual([]);
    } finally { await server.close(); }
  });
}
