import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Builder Shop activation contract", () => {
  it("uses a dedicated idempotent activation endpoint and creates a real Shop page", () => {
    const route = readFileSync(join(process.cwd(), "app/api/projects/[id]/shop/activate/route.ts"), "utf8");
    expect(route).toContain('.eq("slug", "shop")');
    expect(route).toContain('section_type: "products"');
    expect(route).toContain("shopOpened: true");
    expect(route).toContain("shopOpenedAt:");
  });

  it("does not expose May Lecor biography as a generic page seed", () => {
    const route = readFileSync(join(process.cwd(), "app/api/projects/[id]/pages/route.ts"), "utf8");
    expect(route).not.toContain("maylecorAboutPageSections");
    expect(route).not.toContain('"about-may"');
  });

  it("labels the site capability as activation rather than adding a fake shop block", () => {
    const panel = readFileSync(join(process.cwd(), "app/components/create/builder-shop-panel.tsx"), "utf8");
    expect(panel).toContain("Activate Shop");
    expect(panel).toContain("/shop/activate");
  });
});
