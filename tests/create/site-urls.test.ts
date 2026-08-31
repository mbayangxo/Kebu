import { describe, expect, it } from "vitest";
import {
  formatSiteAddressLabel,
  kebuAfricaSiteUrl,
  kebuSitePreviewPath,
} from "@/lib/create/site-urls";

describe("site urls", () => {
  it("builds kebu.africa and preview paths from subdomain", () => {
    expect(kebuAfricaSiteUrl("maylecor")).toBe("https://maylecor.kebu.africa");
    expect(kebuAfricaSiteUrl("kdirection")).toBe("https://kdirection.kebu.africa");
    expect(kebuSitePreviewPath("maylecor")).toBe("/sites/maylecor");
    expect(formatSiteAddressLabel("MayLecor")).toBe("maylecor.kebu.africa");
  });

  it("returns null for empty subdomain", () => {
    expect(kebuAfricaSiteUrl(null)).toBeNull();
    expect(kebuSitePreviewPath("")).toBeNull();
  });
});
