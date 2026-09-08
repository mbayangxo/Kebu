import type { BrandKitRow } from "@/lib/studio/brand-kit";
import type { CanvasDocument, CanvasLayer } from "@/lib/studio/canvas-document";
import { mirrorPageToDocument } from "@/lib/studio/canvas-document";
import { siteAestheticById, type SiteAestheticId } from "@/lib/create/site-aesthetics";
import type { ThemeTokens } from "@/lib/create/website-schema";
import { studioFontByFamily } from "@/lib/studio/fonts-catalog";

export type StudioBrandTokens = {
  primary: string;
  accent: string;
  background: string;
  text: string;
  fontDisplay: string;
  fontBody: string;
  logoUrl?: string;
  aestheticId?: string;
};

export function brandKitToStudioTokens(kit: BrandKitRow): StudioBrandTokens {
  return {
    primary: kit.primary_color,
    accent: kit.accent_color,
    background: kit.background_color,
    text: kit.text_color,
    fontDisplay: kit.font_display,
    fontBody: kit.font_body,
    logoUrl: kit.logo_url?.trim() || undefined,
  };
}

export function aestheticToStudioTokens(aestheticId: string): StudioBrandTokens | null {
  const look = siteAestheticById(aestheticId);
  if (!look) return null;
  const t = look.theme;
  return {
    primary: t.primary,
    accent: t.accent,
    background: t.background,
    text: t.text,
    fontDisplay: t.fontDisplay,
    fontBody: t.fontBody,
    aestheticId: look.id,
  };
}

export function themeToStudioTokens(theme: ThemeTokens): StudioBrandTokens {
  return {
    primary: theme.primary,
    accent: theme.accent,
    background: theme.background,
    text: theme.text,
    fontDisplay: theme.fontDisplay,
    fontBody: theme.fontBody,
    aestheticId: theme.aestheticId,
  };
}

function resolveFont(name: string, fallback: string): string {
  return studioFontByFamily(name)?.family ?? studioFontByFamily(fallback)?.family ?? fallback;
}

function mapLayer(layer: CanvasLayer, tokens: StudioBrandTokens): CanvasLayer {
  const display = resolveFont(tokens.fontDisplay, "Fraunces");
  const body = resolveFont(tokens.fontBody, "system-ui");

  if (layer.type === "text") {
    const name = layer.name.toLowerCase();
    const isDisplay =
      name.includes("headline") ||
      name.includes("title") ||
      name.includes("business") ||
      name.includes("name");
    const isCta = name.includes("cta");
    return {
      ...layer,
      fontFamily: isDisplay ? display : body,
      color: isCta ? "#FFFFFF" : tokens.text,
    };
  }

  if (layer.type === "rect" || layer.type === "ellipse") {
    const name = layer.name.toLowerCase();
    if (name.includes("cta") || name.includes("accent") || name.includes("button")) {
      return { ...layer, fill: tokens.accent };
    }
    if (name.includes("band") || name.includes("bar") || name.includes("panel")) {
      return { ...layer, fill: tokens.primary };
    }
  }

  if (layer.type === "image" && tokens.logoUrl) {
    const name = layer.name.toLowerCase();
    if (name.includes("logo") || name.includes("brand")) {
      return { ...layer, imageUrl: tokens.logoUrl };
    }
  }

  return layer;
}

/**
 * Apply brand / aesthetic tokens onto the active canvas page.
 * Updates background, text fonts/colors, CTA fills, optional logo.
 */
export function applyBrandTokensToCanvas(
  doc: CanvasDocument,
  tokens: StudioBrandTokens,
  pageId?: string,
): CanvasDocument {
  const page = pageId
    ? doc.pages.find((p) => p.id === pageId) ?? doc.pages[0]!
    : doc.pages[0]!;
  const layers = page.layers.map((l) => mapLayer(l, tokens));
  const nextPage = {
    ...page,
    backgroundColor: tokens.background,
    layers,
  };
  const pages = doc.pages.map((p) => (p.id === nextPage.id ? nextPage : p));
  return mirrorPageToDocument(
    {
      ...doc,
      backgroundColor: tokens.background,
      layers,
      pages,
    },
    nextPage,
  );
}

export function applyBrandKitToCanvas(
  doc: CanvasDocument,
  kit: BrandKitRow,
  pageId?: string,
): CanvasDocument {
  return applyBrandTokensToCanvas(doc, brandKitToStudioTokens(kit), pageId);
}

export function applyAestheticToCanvas(
  doc: CanvasDocument,
  aestheticId: SiteAestheticId | string,
  pageId?: string,
): CanvasDocument {
  const tokens = aestheticToStudioTokens(aestheticId);
  if (!tokens) return doc;
  return applyBrandTokensToCanvas(doc, tokens, pageId);
}

export const STUDIO_APPLY_AESTHETIC_IDS = [
  "sahel-light",
  "dakar-night",
  "rose-atelier",
  "lagos-market",
  "coast-linen",
  "studio-ink",
  "carmine-ink",
] as const;
