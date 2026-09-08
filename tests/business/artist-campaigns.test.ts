import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createArtistCampaignSchema,
  updateArtistCampaignSchema,
} from "@/lib/business/artist-campaigns";
import { portalModulesForCategory } from "@/lib/business/portal-modules";

describe("artist campaigns", () => {
  it("validates create + update payloads", () => {
    const created = createArtistCampaignSchema.parse({
      artistId: "11111111-1111-4111-8111-111111111111",
      title: "Single drop",
      channels: ["instagram", "press"],
      pressKitId: null,
    });
    expect(created.title).toBe("Single drop");
    expect(created.channels).toContain("press");

    const updated = updateArtistCampaignSchema.parse({
      campaignId: "22222222-2222-4222-8222-222222222222",
      status: "active",
    });
    expect(updated.status).toBe("active");
  });

  it("rejects unknown channels", () => {
    const bad = createArtistCampaignSchema.safeParse({
      artistId: "11111111-1111-4111-8111-111111111111",
      title: "x",
      channels: ["myspace"],
    });
    expect(bad.success).toBe(false);
  });

  it("ships migration 057", () => {
    const sql = readFileSync(
      join(process.cwd(), "docs/migrations-to-apply/057_business_artist_campaigns.sql"),
      "utf8",
    );
    expect(sql).toContain("business_artist_campaigns");
    expect(sql).toContain("press_kit_id");
  });

  it("exposes artist_campaigns portal module for agencies", () => {
    const mods = portalModulesForCategory("services");
    expect(mods.some((m) => m.id === "artist_campaigns")).toBe(true);
  });
});
