import { creativeWorldSchema, defaultCreativeWorld, type CreativeWorld } from "./creative-world";
import { MAYLECOR_LOCAL_ASSETS } from "./maylecor-defaults";
import type { WebsiteDefinition } from "./website-schema";

/** Explicit new drafts: never auto-upgrade or replace an owner's existing site. */
export function brandCreativeWorld(brand: "kdirection" | "dklns"): CreativeWorld {
  const directional = brand === "kdirection";
  return creativeWorldSchema.parse({
    ...defaultCreativeWorld(),
    brand: directional ? "K↑" : "DKLNS",
    heading: directional ? "WHAT’S MOVING" : "WE MAKE PEOPLE HARD TO IGNORE",
    intro: directional ? "Artists. Releases. Our world. Find your direction." : "Management. Content. Marketing. Creative direction.",
    eyebrow: directional ? "Independent music. Moving forward." : "Management · Content · Marketing",
    footer: directional ? "↑ → ↓ ←" : "Ideas deserve attention.",
    zones: [
      { id: "artists", label: "ARTISTS", heading: "ARTISTS", body: "Meet May Lècor." },
      { id: "releases", label: "RELEASES", heading: "RELEASES", body: "" },
      { id: "world", label: "K WORLD", heading: "K WORLD", body: "" },
      { id: "videos", label: "VIDEOS", heading: "VIDEOS", body: "" },
    ],
    cards: [{ id: "may-lecor", title: "May Lècor", body: "English pop artist. Music, visuals, and May’s world.", image: MAYLECOR_LOCAL_ASSETS.portrait, href: "https://maylecor.com", group: "artists", kind: "person", x: 0, y: 0, rotation: -3 }],
  });
}
export function brandCreativeSite(brand: "kdirection" | "dklns"): WebsiteDefinition {
  const world = brandCreativeWorld(brand);
  return {
    schemaVersion: "website-v1", title: brand === "kdirection" ? "K-Direction — Directional draft" : "DKLNS — Editorial draft",
    theme: { primary: world.background, background: world.background, text: world.foreground, accent: world.accent, fontDisplay: "Arial", fontBody: "Arial", spacing: "comfortable" },
    pages: [{ slug: "home", title: "Home", sections: [{ id: `${brand}-world`, type: "gallery", props: { layout: brand === "kdirection" ? "directional-world" : "campaign-wall", creativeWorld: world, items: [] } }] }],
  };
}
