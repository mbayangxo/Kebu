import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CreativeWorld } from "@/app/components/create/creative-world";
import { creativeWorldSchema, defaultCreativeWorld } from "@/lib/create/creative-world";
import { brandCreativeSite } from "@/lib/create/brand-creative-sites";
import { sectionPropsSchemas, websiteDefinitionSchema } from "@/lib/create/website-schema";

describe("editable creative worlds", () => {
  it.each(["kdirection", "dklns"] as const)("saves %s as an ordinary gallery with no invented media or metrics", brand => {
    const definition = websiteDefinitionSchema.parse(brandCreativeSite(brand));
    const section = definition.pages[0].sections[0];
    expect(section.type).toBe("gallery");
    const parsed = sectionPropsSchemas.gallery.parse(JSON.parse(JSON.stringify(section.props)));
    expect(parsed.creativeWorld?.cards[0].title).toBe("May Lècor");
    expect(parsed.creativeWorld?.audio).toBe("");
    expect(parsed.creativeWorld?.video).toBe("");
    expect(parsed.creativeWorld?.cards).toHaveLength(1);
  });
  it.each(["javascript:alert(1)", "//evil.example", "/\\evil.example", "data:text/html,hi", "https://safe.example/\nwrong"])("rejects unsafe saved destinations %s", href => {
    const world = defaultCreativeWorld();
    expect(creativeWorldSchema.safeParse({ ...world, cards: [{ id: "one", title: "Work", group: "world", href }] }).success).toBe(false);
  });
  it("preserves an empty draft while rejecting duplicate directions and lost card identities", () => {
    const world = defaultCreativeWorld();
    expect(creativeWorldSchema.safeParse({ ...world, heading: "" }).success).toBe(true);
    expect(creativeWorldSchema.safeParse({ ...world, zones: Array(4).fill(world.zones[0]) }).success).toBe(false);
    const card = { id: "same", title: "One", group: "world" };
    expect(creativeWorldSchema.safeParse({ ...world, cards: [card, card] }).success).toBe(false);
  });
  it("renders invalid saved data honestly and does not silently replace it with demo content", () => {
    const html = renderToStaticMarkup(createElement(CreativeWorld, { layout: "campaign-wall", value: { heading: "Damaged" } }));
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("Make something unforgettable");
  });
});
