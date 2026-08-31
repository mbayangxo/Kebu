import { describe, expect, it } from "vitest";
import {
  formatSiteAddressLabel,
  kebuAfricaSiteUrl,
  kebuSitePreviewPath,
  liveSiteUrl,
  plannedKebuAfricaHost,
} from "@/lib/create/site-urls";

describe("site-urls", () => {
  it("uses /sites paths as the live product URL", () => {
    expect(kebuSitePreviewPath("maylecor")).toBe("/sites/maylecor");
    expect(kebuSitePreviewPath("kdirection")).toBe("/sites/kdirection");
    expect(liveSiteUrl("maylecor")).toMatch(/\/sites\/maylecor$/);
  });

  it("labels kebu.africa as planned only", () => {
    expect(plannedKebuAfricaHost("MayLecor")).toBe("maylecor.kebu.africa");
    expect(formatSiteAddressLabel("MayLecor")).toBe("maylecor.kebu.africa");
    expect(kebuAfricaSiteUrl("maylecor")).toBe("https://maylecor.kebu.africa");
  });

  it("returns null for empty subdomain", () => {
    expect(kebuAfricaSiteUrl(null)).toBeNull();
    expect(kebuSitePreviewPath("")).toBeNull();
    expect(liveSiteUrl(null)).toBeNull();
  });
});
