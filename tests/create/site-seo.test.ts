import { describe, expect, it } from "vitest";
import {
  containsUnsafeSiteContent,
  defaultSiteSeo,
  mergeSiteSeo,
  siteMetadataFromDefinition,
} from "@/lib/create/site-seo";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";

describe("site seo", () => {
  it("builds metadata with favicon and open graph", () => {
    const seo = defaultSiteSeo("Baobab Studio");
    const meta = siteMetadataFromDefinition({
      title: "Baobab Studio",
      seo: { ...seo, faviconUrl: "https://cdn.example/favicon.ico", ogImageUrl: "https://cdn.example/og.jpg" },
      canonicalBase: "https://baobab.kebu.africa",
    });
    expect(meta.title).toBe("Baobab Studio");
    expect(meta.icons).toEqual({
      icon: "https://cdn.example/favicon.ico",
      shortcut: "https://cdn.example/favicon.ico",
    });
    expect(meta.openGraph?.images).toEqual([{ url: "https://cdn.example/og.jpg" }]);
  });

  it("merges partial seo safely", () => {
    const merged = mergeSiteSeo({ metaDescription: "Handmade in Dakar" }, "Atelier");
    expect(merged.metaTitle).toBe("Atelier");
    expect(merged.metaDescription).toBe("Handmade in Dakar");
  });

  it("blocks unsafe serialized props", () => {
    expect(containsUnsafeSiteContent('{"x":"<script>alert(1)</script>"}')).toBe(true);
    expect(containsUnsafeSiteContent('{"x":"onerror=alert(1)"}')).toBe(true);
    expect(containsUnsafeSiteContent('{"x":"Hello world"}')).toBe(false);
  });

  it("validates definition with seo block", () => {
    const result = validateWebsiteDefinition({
      schemaVersion: "website-v1",
      title: "Test",
      theme: {
        primary: "#000",
        accent: "#fff",
        background: "#fff",
        text: "#000",
        fontDisplay: "Fraunces",
        fontBody: "system-ui",
        spacing: "comfortable",
      },
      seo: defaultSiteSeo("Test"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [{ type: "hero", props: { heading: "Hi", subheading: "", buttonLabel: "Go", buttonHref: "#" } }],
        },
      ],
    });
    expect(result.ok).toBe(true);
  });
});
