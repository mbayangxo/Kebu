import { describe, expect, it } from "vitest";
import { defaultSiteChrome, removeSiteChromePart } from "@/lib/create/site-chrome";

describe("removable site chrome", () => {
  it("removes navigation without deleting the footer", () => {
    const chrome = defaultSiteChrome("Artist");
    const next = removeSiteChromePart(chrome, "header");
    expect(next.header).toBeUndefined();
    expect(next.footer).toBeDefined();
    expect(next.enabled).toBe(true);
  });

  it("disables universal chrome when the final remaining part is removed", () => {
    const chrome = removeSiteChromePart(defaultSiteChrome("Artist"), "header");
    const next = removeSiteChromePart(chrome, "footer");
    expect(next.header).toBeUndefined();
    expect(next.footer).toBeUndefined();
    expect(next.enabled).toBe(false);
  });
});
