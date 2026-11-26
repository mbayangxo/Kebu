import { describe, expect, it } from "vitest";
import { builderDraftCheckpoint } from "@/lib/create/builder-draft-checkpoint";
import { parseSiteChrome, patchSiteChromePart } from "@/lib/create/site-chrome";

const base = { projectId: "project-a", pending: new Set<string>(), historyDirtyIds: [], sections: [{ id: "hero", props: { text: "latest local text" }, page_id: "home", section_type: "hero", sort_order: 0 }], siteChrome: null };

describe("Builder draft checkpoints", () => {
  it("preserves a debounced or rejected section's newest props without claiming server success", () => {
    expect(builderDraftCheckpoint({ ...base, pending: new Set(["section:hero"]) })).toEqual({ sections: [{ projectId: "project-a", sectionId: "hero", props: { text: "latest local text" } }], chrome: [], history: null });
  });
  it("saved sections produce no queue mutation", () => {
    expect(builderDraftCheckpoint(base)).toEqual({ sections: [], chrome: [], history: null });
  });
  it("keeps an Undo/Redo step atomic, including restored rows and deleted sections", () => {
    const plan = builderDraftCheckpoint({ ...base, pending: new Set(["history", "section:hero"]), historyDirtyIds: ["removed"] });
    expect(plan.sections).toEqual([]);
    expect(plan.history).toEqual({ projectId: "project-a", updates: [{ id: "hero", props: { text: "latest local text" }, sort_order: 0, restore: { page_id: "home", section_type: "hero", sort_order: 0 } }], deletes: ["removed"] });
  });
  it("does not invent row restoration metadata for incomplete legacy rows", () => {
    const plan = builderDraftCheckpoint({ ...base, pending: new Set(["history"]), historyDirtyIds: ["hero"], sections: [{ id: "hero", props: { text: "latest" } }] });
    expect(plan.history?.updates).toEqual([{ id: "hero", props: { text: "latest" } }]);
  });
  it("does not enqueue unchanged sections in a history step", () => {
    const plan = builderDraftCheckpoint({ ...base, pending: new Set(["history"]), historyDirtyIds: ["removed"] });
    expect(plan.history?.updates).toEqual([]);
    expect(plan.history?.deletes).toEqual(["removed"]);
  });
  it("preserves both pending header and footer from the latest local chrome", () => {
    let chrome = patchSiteChromePart(parseSiteChrome(null), "header", { brand: "Latest header" });
    chrome = patchSiteChromePart(chrome, "footer", { text: "Latest footer" });
    const plan = builderDraftCheckpoint({ ...base, pending: new Set(["chrome:header", "chrome:footer"]), siteChrome: chrome });
    expect(plan.chrome.map(item => item.part)).toEqual(["header", "footer"]);
    expect(plan.chrome[0].props.brand).toBe("Latest header");
    expect(plan.chrome[1].props.text).toBe("Latest footer");
  });
});
