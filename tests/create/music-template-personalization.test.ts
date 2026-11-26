import { describe, expect, it } from "vitest";
import { definitionFromTemplateSlug } from "@/lib/create/ai-generate";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";
import { createWebsiteBriefSchema, validateWebsiteDefinition } from "@/lib/create/website-schema";
const brief = createWebsiteBriefSchema.parse({mode:"template",businessName:"May Lècor",category:"music",description:"English pop artist. Music and live performances.",countryCode:"SN"});
for(const slug of ["musician-artist","musician-streaming"]) {
  describe(`${slug} editable template copy`,()=>{
    it("personalizes every page without changing the reusable seed or another artist's copy",()=>{
      const seed=TEMPLATE_SEEDS.find(t=>t.slug===slug)!;
      const original=JSON.stringify(seed.definition);
      const first=definitionFromTemplateSlug(slug,brief)!;
      const second=definitionFromTemplateSlug(slug,{...brief,businessName:"Another artist"})!;
      expect(validateWebsiteDefinition(first).ok).toBe(true);
      expect(first.pages.length).toBeGreaterThan(1);
      for(const page of first.pages) expect(page.sections.find(s=>s.type==="navigation")?.props.brand).toBe("May Lècor");
      for(const page of second.pages) expect(page.sections.find(s=>s.type==="navigation")?.props.brand).toBe("Another artist");
      first.pages[0].sections.find(s=>s.type==="hero")!.props.heading="My edited headline";
      expect(second.pages[0].sections.find(s=>s.type==="hero")!.props.heading).toBe("Another artist");
      expect(JSON.stringify(seed.definition)).toBe(original);
    });
    it("does not create empty photo blocks or link bookings to a fabricated number",()=>{
      const site=definitionFromTemplateSlug(slug,brief)!;
      for(const page of site.pages) for(const section of page.sections) {
        expect(section.type).not.toBe("whatsapp");
        if(section.type==="image") expect(section.props.src).toBeTruthy();
        if(section.type==="gallery") for(const item of section.props.items as {src:string}[]) expect(item.src).toBeTruthy();
      }
      expect(JSON.stringify(site)).not.toContain("+221770000000");
    });
  });
}
