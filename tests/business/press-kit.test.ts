import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createArtistSchema,
  defaultPressKitBody,
  parsePressKitBody,
  pressKitBodySchema,
  pressKitPublicPath,
  slugifyArtistName,
  upsertPressKitSchema,
} from "@/lib/business/press-kit";
import { portalModulesForCategory } from "@/lib/business/portal-modules";

describe("press kit schema", () => {
  it("slugifies artist names safely", () => {
    expect(slugifyArtistName("May Lecor")).toBe("may-lecor");
    expect(slugifyArtistName("  DK!! ")).toBe("dk");
    expect(slugifyArtistName("A")).toBe("a0");
  });

  it("validates artist create + kit body", () => {
    const artist = createArtistSchema.parse({
      stageName: "May Lecor",
      bioShort: "Artist signed to DkLNS",
      hometown: "Dakar",
    });
    expect(artist.stageName).toBe("May Lecor");

    const kit = upsertPressKitSchema.parse({
      artistId: "11111111-1111-4111-8111-111111111111",
      title: "EPK 2026",
      status: "published",
      kit: defaultPressKitBody("May Lecor"),
    });
    expect(kit.kit?.headline).toMatch(/May Lecor/);
    expect(pressKitPublicPath("kit_abc")).toBe("/k/kit_abc");
  });

  it("rejects unsafe asset urls", () => {
    const bad = pressKitBodySchema.safeParse({
      assets: [{ title: "x", url: "javascript:alert(1)", kind: "photo" }],
    });
    expect(bad.success).toBe(false);
  });

  it("parses empty kit safely", () => {
    const body = parsePressKitBody({});
    expect(body.headline).toBe("");
    expect(body.bio).toBe("");
    expect(body.quotes).toEqual([]);
    expect(body.assets).toEqual([]);
  });

  it("ships migration 056", () => {
    const sql = readFileSync(
      join(process.cwd(), "docs/migrations-to-apply/056_business_artists_press_kits.sql"),
      "utf8",
    );
    expect(sql).toContain("business_artists");
    expect(sql).toContain("business_press_kits");
    expect(sql).toContain("'published'");
  });

  it("exposes press + campaign modules for agency categories", () => {
    const mods = portalModulesForCategory("services");
    expect(mods.some((m) => m.id === "press")).toBe(true);
    expect(mods.some((m) => m.id === "artist_campaigns")).toBe(true);
  });
});
