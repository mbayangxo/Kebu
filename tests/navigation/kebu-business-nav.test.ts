import { describe, expect, it } from "vitest";
import {
  buildKebuBusinessNav,
  kebuBusinessNavStats,
  resolveKebuBusinessNavHref,
} from "@/lib/navigation/kebu-business-nav";

describe("kebu business nav", () => {
  const ctx = { projectId: "11111111-1111-4111-8111-111111111111", businessId: null };

  it("includes all top-level sections from the IA spec", () => {
    const sections = buildKebuBusinessNav(ctx);
    const labels = sections.map((s) => s.label);
    expect(labels).toContain("Home");
    expect(labels).toContain("Website");
    expect(labels).toContain("AI Builder");
    expect(labels).toContain("Shop");
    expect(labels).toContain("Marketing");
    expect(labels).toContain("Analytics");
    expect(labels).toContain("Business");
    expect(labels).toContain("Growth");
    expect(labels).toContain("Domains");
    expect(labels).toContain("Email");
    expect(labels).toContain("Cloud");
  });

  it("maps website pages to the editor", () => {
    const website = buildKebuBusinessNav(ctx).find((s) => s.id === "website");
    const pages = website?.items?.find((i) => i.id === "website-pages");
    expect(pages?.href).toBe(`/create/${ctx.projectId}`);
    expect(pages?.status).toBe("live");
  });

  it("resolves anchor links on home path", () => {
    expect(
      resolveKebuBusinessNavHref({ anchor: "domain" }, `/my-sites/${ctx.projectId}`),
    ).toBe(`/my-sites/${ctx.projectId}#domain`);
  });

  it("counts nav item statuses", () => {
    const stats = kebuBusinessNavStats(buildKebuBusinessNav(ctx));
    expect(stats.total).toBeGreaterThan(40);
    expect(stats.live + stats.partial + stats.notImplemented).toBe(stats.total);
  });
});
