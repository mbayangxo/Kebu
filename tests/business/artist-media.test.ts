import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createArtistMediaSchema,
  inferPlatformFromUrl,
  updateArtistMediaSchema,
} from "@/lib/business/artist-media";
import { portalModulesForCategory } from "@/lib/business/portal-modules";

describe("artist media (reels / MV)", () => {
  it("infers platform from URL", () => {
    expect(inferPlatformFromUrl("https://www.youtube.com/watch?v=abcdefghijk")).toBe("youtube");
    expect(inferPlatformFromUrl("https://www.tiktok.com/@x/video/1")).toBe("tiktok");
    expect(inferPlatformFromUrl("https://cdn.example.com/clip.mp4")).toBe("direct");
  });

  it("validates create + update", () => {
    const created = createArtistMediaSchema.parse({
      artistId: "11111111-1111-4111-8111-111111111111",
      title: "May — Official MV",
      url: "https://youtu.be/abcdefghijk",
      kind: "music_video",
      status: "published",
    });
    expect(created.kind).toBe("music_video");

    const updated = updateArtistMediaSchema.parse({
      mediaId: "22222222-2222-4222-8222-222222222222",
      status: "archived",
    });
    expect(updated.status).toBe("archived");
  });

  it("rejects javascript urls", () => {
    const bad = createArtistMediaSchema.safeParse({
      artistId: "11111111-1111-4111-8111-111111111111",
      title: "x",
      url: "javascript:alert(1)",
    });
    expect(bad.success).toBe(false);
  });

  it("ships migration 058", () => {
    const sql = readFileSync(
      join(process.cwd(), "docs/migrations-to-apply/058_business_artist_media.sql"),
      "utf8",
    );
    expect(sql).toContain("business_artist_media");
    expect(sql).toContain("'music_video'");
    expect(sql).toContain("business_artist_campaigns");
  });

  it("exposes artist_media portal module", () => {
    const mods = portalModulesForCategory("services");
    expect(mods.some((m) => m.id === "artist_media")).toBe(true);
  });
});
