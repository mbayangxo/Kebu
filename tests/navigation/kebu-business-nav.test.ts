import { describe, expect, it } from "vitest";
import {
  buildKebuBusinessNav,
  kebuBusinessNavStats,
  resolveKebuBusinessNavHref,
} from "@/lib/navigation/kebu-business-nav";

describe("kebu business nav (Shopify-style accordion IA)", () => {
  const ctx = { projectId: "11111111-1111-4111-8111-111111111111", businessId: null as string | null };

  it("exposes Home + Online Store channel without shop solos when shop closed", () => {
    const sections = buildKebuBusinessNav({ ...ctx, shopOpened: false });
    const labels = sections.map((s) => s.label);
    expect(labels).toContain("Home");
    expect(labels).toContain("Online Store");
    expect(labels).toContain("Shop");
    expect(labels).toContain("Analytics");
    expect(labels).toContain("Settings");
    expect(labels).not.toContain("Orders");
    expect(labels).not.toContain("Products");
    const online = sections.find((s) => s.id === "online-store");
    expect(online?.groupLabel).toBe("Sales channels");
    expect(online?.items?.some((i) => i.id === "os-customize")).toBe(true);
  });

  it("adds Orders/Products/Customers when shop is open", () => {
    const sections = buildKebuBusinessNav({ ...ctx, shopOpened: true });
    const labels = sections.map((s) => s.label);
    expect(labels).toContain("Orders");
    expect(labels).toContain("Products");
    expect(labels).toContain("Customers");
  });

  it("maps Online Store Themes to per-site themes library", () => {
    const online = buildKebuBusinessNav(ctx).find((s) => s.id === "online-store");
    const themes = online?.items?.find((i) => i.id === "os-themes");
    expect(themes?.href).toBe(`/create/${ctx.projectId}/themes`);
    expect(themes?.status).toBe("live");
    const discover = online?.items?.find((i) => i.id === "os-discover");
    expect(discover?.href).toBe("/create/aesthetics");
  });

  it("maps Online Store customize to the editor", () => {
    const online = buildKebuBusinessNav(ctx).find((s) => s.id === "online-store");
    const customize = online?.items?.find((i) => i.id === "os-customize");
    expect(customize?.href).toBe(`/create/${ctx.projectId}`);
    expect(customize?.status).toBe("live");
  });

  it("resolves anchor links on home path", () => {
    expect(
      resolveKebuBusinessNavHref({ anchor: "domain" }, `/my-sites/${ctx.projectId}`),
    ).toBe(`/my-sites/${ctx.projectId}#domain`);
  });

  it("counts nav item statuses", () => {
    const stats = kebuBusinessNavStats(buildKebuBusinessNav({ ...ctx, shopOpened: true }));
    expect(stats.total).toBeGreaterThan(10);
    expect(stats.live + stats.partial + stats.notImplemented).toBe(stats.total);
  });
});
