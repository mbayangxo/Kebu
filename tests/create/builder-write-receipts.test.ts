import { describe, expect, it, vi } from "vitest";
import { builderChromeReceipt, builderPublishReceipt, builderSectionReceipt, builderSettingsReceipt, confirmBuilderDraftRefresh } from "@/lib/create/builder-write-receipts";
import { defaultSiteChrome } from "@/lib/create/site-chrome";

describe("Builder write receipts", () => {
  it.each([false, true])("refresh %s clears pending/history only after a confirmed reload", async loaded => {
    const mark = vi.fn();
    expect(await confirmBuilderDraftRefresh(async () => loaded, mark)).toBe(loaded);
    expect(mark).toHaveBeenCalledTimes(loaded ? 1 : 0);
  });
  it("a thrown refresh never clears pending/history", async () => {
    const mark = vi.fn();
    await expect(confirmBuilderDraftRefresh(async () => { throw new Error("Refresh failed"); }, mark)).rejects.toThrow("Refresh failed");
    expect(mark).not.toHaveBeenCalled();
  });
  it.each([null, {}, { section: null }, { section: { id: "other", props: {} } }, { section: { id: "hero", props: [] } }])("incomplete or wrong-row section reply %j cannot acknowledge the edit", body => {
    expect(builderSectionReceipt(body, "hero")).toBeNull();
  });
  it("accepts the matching section row and retains normalized server props", () => {
    expect(builderSectionReceipt({ section: { id: "hero", props: { text: "Server-normalized text" }, sort_order: 0 } }, "hero")).toMatchObject({ id: "hero", props: { text: "Server-normalized text" } });
  });
  it("site settings require the matching project receipt", () => {
    expect(builderSettingsReceipt({ project: { id: "owner-project" } }, "owner-project")).toBe(true);
    expect(builderSettingsReceipt({ project: { id: "other-project" } }, "owner-project")).toBe(false);
    expect(builderSettingsReceipt({ ok: true }, "owner-project")).toBe(false);
  });
  it("chrome requires a valid confirmed part rather than an arbitrary successful body", () => {
    const siteChrome = defaultSiteChrome("Confirmed brand");
    expect(builderChromeReceipt({ siteChrome }, "header")).toMatchObject({ brand: "Confirmed brand" });
    expect(builderChromeReceipt({ siteChrome: { enabled: false } }, "header")).toBeNull();
    expect(builderChromeReceipt({ siteChrome: { footer: siteChrome.footer } }, "header")).toBeNull();
    expect(builderChromeReceipt({}, "footer")).toBeNull();
  });
  it.each([
    {}, { deployment: { status: "building", subdomain: "site", public_path: "/sites/site" } },
    { deployment: { status: "live", subdomain: "other", public_path: "/sites/other" } },
    { deployment: { status: "live", subdomain: "site", public_path: "https://unrelated.example" } },
  ])("a partial or mismatched publish reply %j cannot claim this site is live", body => {
    expect(builderPublishReceipt(body, "site")).toBeNull();
  });
  it("accepts the server's live receipt for the requested address", () => {
    expect(builderPublishReceipt({ deployment: { status: "live", subdomain: "site", public_path: "/sites/site" } }, "site")).toBe("/sites/site");
  });
});
