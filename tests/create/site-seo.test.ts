import { describe, expect, it } from "vitest";
import {
  buildSiteJsonLd,
  containsUnsafeSiteContent,
  defaultSiteSeo,
  extractTextFromDefinition,
  mergeSiteSeo,
  siteMetadataFromDefinition,
} from "@/lib/create/site-seo";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

const sampleDefinition: WebsiteDefinition = {
  schemaVersion: "website-v1",
  title: "Baobab Studio",
  theme: {
    primary: "#000",
    accent: "#fff",
    background: "#fff",
    text: "#000",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable",
  },
  pages: [
    {
      slug: "home",
      title: "Home",
      sections: [
        {
          type: "hero",
          props: {
            heading: "Handmade in Dakar",
            subheading: "Bags and textiles for modern Africa",
            buttonLabel: "Shop",
            buttonHref: "#",
          },
        },
      ],
    },
  ],
};

describe("site seo", () => {
  it("builds metadata with favicon and open graph", () => {
    const seo = defaultSiteSeo("Baobab Studio");
    const meta = siteMetadataFromDefinition({
      title: "Baobab Studio",
      seo: { ...seo, faviconUrl: "https://cdn.example/favicon.ico", ogImageUrl: "https://cdn.example/og.jpg" },
      canonicalBase: "https://baobab.example",
    });
    expect(meta.title).toBe("Baobab Studio");
    expect(meta.icons).toEqual({
      icon: "https://cdn.example/favicon.ico",
      shortcut: "https://cdn.example/favicon.ico",
    });
    expect(meta.openGraph?.images).toEqual([
      { url: "https://cdn.example/og.jpg", width: 1200, height: 630, alt: "Baobab Studio" },
    ]);
  });

  it("merges partial seo safely", () => {
    const merged = mergeSiteSeo({ metaDescription: "Handmade in Dakar" }, "Atelier");
    expect(merged.metaTitle).toBe("Atelier");
    expect(merged.metaDescription).toBe("Handmade in Dakar");
  });

  it("auto-extracts description from page content", () => {
    const text = extractTextFromDefinition(sampleDefinition);
    expect(text).toMatch(/Handmade in Dakar/);
    const meta = siteMetadataFromDefinition({
      title: "Baobab Studio",
      seo: defaultSiteSeo("Baobab Studio"),
      canonicalBase: "https://baobab.example",
      definition: sampleDefinition,
    });
    expect(meta.description).toMatch(/Handmade in Dakar/);
  });

  it("builds JSON-LD graph with organization and website", () => {
    const seo = mergeSiteSeo(
      {
        businessType: "MusicGroup",
        city: "Dakar",
        country: "Senegal",
        sameAs: "https://instagram.com/baobab\nhttps://youtube.com/@baobab",
        ogImageUrl: "https://cdn.example/og.jpg",
      },
      "Baobab Studio",
    );
    const graph = buildSiteJsonLd({
      seo,
      title: "Baobab Studio",
      canonicalBase: "https://www.baobab.example",
      definition: sampleDefinition,
    });
    expect(graph.some((n) => n["@type"] === "MusicGroup")).toBe(true);
    expect(graph.some((n) => n["@type"] === "WebSite")).toBe(true);
    expect(graph.some((n) => n["@type"] === "WebPage")).toBe(true);
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
