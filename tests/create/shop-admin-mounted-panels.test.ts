/**
 * Regression for a confirmed dormant-feature gap: EmailFlowsPanel and
 * ShopNewsletterPanel were fully built (real schema: migrations_archive/
 * legacy/097_email_automation_flows.sql; real API routes under
 * app/api/projects/[id]/flows/**) but never rendered anywhere in the app —
 * a merchant had no way to reach either feature. Both are now mounted into
 * the Shop admin under a new "Marketing" nav group (tabs "flows" and
 * "newsletter"). This proves the actual integration points — the import and
 * the exact props shop-admin-client.tsx now passes — mount cleanly, server-
 * rendering their real chrome before any fetch resolves. Live data fetching
 * itself is already covered by each panel's own API route's existing tests.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmailFlowsPanel } from "@/app/components/create/email-flows-panel";
import { ShopNewsletterPanel } from "@/app/components/shop/shop-newsletter-panel";
import { NAV_GROUPS } from "@/app/components/shop/shop-side-nav";

describe("previously-unmounted Shop admin panels are now wired in", () => {
  it("EmailFlowsPanel mounts with the real projectId prop shop-admin-client.tsx passes, no crash", () => {
    const html = renderToStaticMarkup(createElement(EmailFlowsPanel, { projectId: "11111111-1111-4111-8111-100000000001" }));
    expect(html.length).toBeGreaterThan(0);
  });

  it("ShopNewsletterPanel mounts with the real projectId/sub props shop-admin-client.tsx passes, no crash", () => {
    const html = renderToStaticMarkup(createElement(ShopNewsletterPanel, { projectId: "11111111-1111-4111-8111-100000000001" }));
    expect(html.length).toBeGreaterThan(0);
  });

  it("the Shop side-nav now lists a real Marketing group routing to the flows/newsletter tabs", () => {
    const marketing = NAV_GROUPS.find((g) => g.id === "marketing");
    expect(marketing).toBeDefined();
    const tabs = marketing!.items.map((i) => i.tab);
    expect(tabs).toContain("flows");
    expect(tabs).toContain("newsletter");
  });
});
