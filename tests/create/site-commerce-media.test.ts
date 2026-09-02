import { describe, expect, it } from "vitest";
import { isDirectAudioUrl, isDirectVideoUrl } from "@/lib/create/site-asset-upload";
import { resolveMerchantWhatsApp, whatsAppOrderHref } from "@/lib/create/site-commerce";
import { mergeSiteSeo } from "@/lib/create/site-seo";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

describe("site-asset-upload", () => {
  it("detects hosted audio and video URLs", () => {
    expect(isDirectAudioUrl("https://x.supabase.co/storage/v1/object/public/site-assets/a.mp3")).toBe(true);
    expect(isDirectVideoUrl("https://cdn.example.com/clip.mp4")).toBe(true);
    expect(isDirectAudioUrl("https://open.spotify.com/track/1")).toBe(false);
  });
});

describe("site-commerce", () => {
  const def: WebsiteDefinition = {
    schemaVersion: "website-v1",
    title: "Shop",
    theme: {
      primary: "#000",
      accent: "#0f0",
      background: "#fff",
      text: "#000",
      fontDisplay: "sans",
      fontBody: "sans",
      spacing: "comfortable",
    },
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          { type: "whatsapp", props: { phone: "+221771234567", label: "Chat" } },
          {
            type: "products",
            props: {
              heading: "Shop",
              items: [{ name: "Shirt", description: "", priceLabel: "5000", imageUrl: "" }],
            },
          },
        ],
      },
    ],
    seo: mergeSiteSeo(
      { commerce: { merchantWhatsApp: "+221779998877", preferJokoCheckout: false } },
      "Shop",
    ),
  };

  it("prefers commerce settings for merchant phone", () => {
    expect(resolveMerchantWhatsApp(def, def.seo)).toBe("221779998877");
  });

  it("builds WhatsApp order links with phone", () => {
    expect(whatsAppOrderHref("221771234567", "Order shirt")).toContain("221771234567");
    expect(whatsAppOrderHref("221771234567", "Order shirt")).toContain("text=");
  });
});
