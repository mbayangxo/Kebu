import type { Page } from "playwright/test";
import { writeFileSync } from "node:fs";
import { open3jDatabase, projectId, owner } from "./3j-database";
import { documentToRows } from "@/lib/create/kcd-adapter";
import type { Transaction } from "@/lib/creative-core";

/** Browser transport backed by the actual migrated isolated SQL authority. */
export async function openBuilderSqlBridge(page: Page, initialize?: (server: Awaited<ReturnType<typeof open3jDatabase>>) => Promise<void>) {
  const server = await open3jDatabase();
  if (initialize) await initialize(server);
  else await server.apply((await server.proposal()).transaction);
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
