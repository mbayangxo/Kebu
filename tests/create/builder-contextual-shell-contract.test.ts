import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Builder contextual shell contract", () => {
  const chrome = readFileSync(join(process.cwd(), "app/components/create/builder-studio-chrome.tsx"), "utf8");
  const page = readFileSync(join(process.cwd(), "app/create/[id]/page.tsx"), "utf8");

  it("keeps the permanent rail focused on primary editing jobs", () => {
    for (const label of ["Add", "Pages", "Layers", "Design", "Assets", "Apps", "Shop", "Versions"]) {
      expect(chrome).toContain(`label: "${label}"`);
    }
    expect(chrome).not.toMatch(/id: "nav"[\s\S]{0,80}label:/);
    expect(chrome).not.toMatch(/id: "connections"[\s\S]{0,80}label:/);
    expect(chrome).not.toMatch(/id: "seo"[\s\S]{0,80}label:/);
  });

  it("does not dump blog management into the default Sections inspector", () => {
    const contentStart = page.indexOf('{sidebarTab === "content"');
    const extensionsStart = page.indexOf('{sidebarTab === "extensions"');
    expect(contentStart).toBeGreaterThan(-1);
    expect(extensionsStart).toBeGreaterThan(-1);
    expect(page.slice(contentStart, extensionsStart)).not.toContain("<BuilderBlogPanel");
    expect(page.slice(extensionsStart)).toContain("<BuilderBlogPanel");
  });

  it("keeps the panel canvas-first and closed by default", () => {
    expect(page).toContain("const [leftPanelOpen, setLeftPanelOpen] = useState(false)");
    expect(page).toContain("if (leftPanelOpen && sidebarTab === tab)");
    expect(page).toContain("setLeftPanelOpen(false)");
  });
});
