import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { upgradeDklnsPortfolioProject } from "@/lib/create/upgrade-portfolio-dklns";
import { upgradeKdirectionPortfolioProject } from "@/lib/create/upgrade-portfolio-kdirection";
import { upgradeMayjorGoodPortfolioProject } from "@/lib/create/upgrade-portfolio-mayjor-good";
import { upgradeMaylecorPortfolioProject } from "@/lib/create/upgrade-portfolio-maylecor";
import { upgradeNdaoanPortfolioProject } from "@/lib/create/upgrade-portfolio-ndaoan";
import { goLiveWebsiteProject } from "@/lib/create/go-live";
import { legacyProjectWriteBlocker } from "@/lib/create/kcd-write-guard";
function client(data: unknown = { document_schema_version: "kcd-1" }, error: unknown = null) {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data, error }) };
  const from = vi.fn((table: string) => { if (table !== "projects") throw new Error("Legacy table access"); return query; });
  return { db: { from } as unknown as SupabaseClient, from };
}
describe("non-route legacy writer boundary", () => {
  it.each([
    upgradeDklnsPortfolioProject, upgradeKdirectionPortfolioProject, upgradeMayjorGoodPortfolioProject,
    upgradeMaylecorPortfolioProject, upgradeNdaoanPortfolioProject,
  ])("blocks a direct portfolio helper before mutations", async (upgrade) => {
    const { db, from } = client();
    expect(await upgrade(db, "project")).toMatchObject({ upgraded: false, detail: expect.stringMatching(/operation editing/) });
    expect(from).toHaveBeenCalledTimes(1);
  });
  it("blocks a direct go-live caller before snapshot reads/deployment changes", async () => {
    const { db, from } = client();
    expect(await goLiveWebsiteProject({ supabase: db, userId: "owner", projectId: "project", subdomain: "site" })).toMatchObject({ ok: false, error: expect.stringMatching(/operation editing/) });
    expect(from).toHaveBeenCalledTimes(1);
  });
  it("fails closed on unreadable editing mode and retains the original 3B mode", async () => {
    expect(await legacyProjectWriteBlocker(client(null, { message: "connection unavailable" }).db, "project")).toMatch(/No legacy changes/);
    expect(await legacyProjectWriteBlocker(client(null).db, "project")).toBe("Project not found.");
    expect(await legacyProjectWriteBlocker(client({ document_schema_version: null }).db, "project")).toBeNull();
  });
});
