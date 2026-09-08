import { describe, expect, it } from "vitest";
import { slugifyBlogTitle, blogPostInputSchema } from "@/lib/create/site-blog";
import { readDeviceOverride, patchDeviceProp } from "@/lib/create/device-overrides";
import { buildCommerceAnalytics } from "@/lib/shop/commerce-insights";

describe("W15 blog", () => {
  it("slugifies titles", () => {
    expect(slugifyBlogTitle("Hello World!")).toBe("hello-world");
  });

  it("validates blog post input", () => {
    const parsed = blogPostInputSchema.safeParse({
      slug: "first-post",
      title: "First post",
      status: "published",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("W9 device overrides", () => {
  it("reads mobile override when editing phone", () => {
    const props = {
      heading: "Desktop",
      deviceOverrides: { mobile: { heading: "Mobile headline" } },
    };
    expect(readDeviceOverride(props, "mobile", "heading")).toBe("Mobile headline");
    expect(readDeviceOverride(props, "desktop", "heading")).toBe("Desktop");
  });

  it("patches mobile bucket without touching desktop", () => {
    const next = patchDeviceProp({ heading: "Desktop" }, "mobile", { heading: "Mobile" });
    expect(next.heading).toBe("Desktop");
    expect((next.deviceOverrides as { mobile?: { heading?: string } }).mobile?.heading).toBe("Mobile");
  });

  it("supports text body and features items on tablet", () => {
    const text = patchDeviceProp({ heading: "H", body: "Desktop body" }, "tablet", { body: "Tablet body" });
    expect(readDeviceOverride(text, "tablet", "body")).toBe("Tablet body");
    expect(readDeviceOverride(text, "desktop", "body")).toBe("Desktop body");

    const features = patchDeviceProp(
      { heading: "Features", items: [{ title: "A", body: "Desk" }] },
      "mobile",
      { items: [{ title: "A", body: "Phone" }] },
    );
    expect(
      (readDeviceOverride(features, "mobile", "items") as { body: string }[])[0].body,
    ).toBe("Phone");
  });
});

describe("AN1 funnel analytics", () => {
  it("includes funnel counts in commerce summary", () => {
    const summary = buildCommerceAnalytics({
      rangeDays: 30,
      projectId: "p1",
      orders: [],
      drafts: [],
      pageviews: 100,
      funnel: { productViews: 40, addToCart: 10, checkoutStart: 5, purchases: 2 },
    });
    expect(summary.traffic.funnel?.productViews).toBe(40);
    expect(summary.traffic.funnel?.purchases).toBe(2);
  });
});
