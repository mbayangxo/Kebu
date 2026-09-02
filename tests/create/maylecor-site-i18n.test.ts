import { describe, expect, it } from "vitest";
import { maylecorNavLabel, parseMaylecorLocale } from "@/lib/create/maylecor-site-i18n";

describe("maylecor-site-i18n", () => {
  it("parses locale codes", () => {
    expect(parseMaylecorLocale("fr")).toBe("fr");
    expect(parseMaylecorLocale("bad")).toBe("en");
  });

  it("translates nav labels", () => {
    expect(maylecorNavLabel("shop", "en")).toBe("Shop");
    expect(maylecorNavLabel("shop", "fr")).toBe("Boutique");
  });
});
