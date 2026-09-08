import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  STUDIO_FONTS_CATALOG,
  googleFontsHrefForStudioCatalog,
} from "@/lib/studio/fonts-catalog";
import { SITE_AESTHETICS } from "@/lib/create/site-aesthetics";
import { STUDIO_APPLY_AESTHETIC_IDS } from "@/lib/studio/brand-apply";

export const dynamic = "force-dynamic";

/** Studio fonts catalog + aesthetics available for brand apply. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const aesthetics = SITE_AESTHETICS.filter((a) =>
    (STUDIO_APPLY_AESTHETIC_IDS as readonly string[]).includes(a.id),
  ).map((a) => ({
    id: a.id,
    name: a.name,
    tagline: a.tagline,
    primary: a.theme.primary,
    accent: a.theme.accent,
    background: a.theme.background,
    text: a.theme.text,
    fontDisplay: a.theme.fontDisplay,
    fontBody: a.theme.fontBody,
  }));

  return NextResponse.json({
    fonts: STUDIO_FONTS_CATALOG,
    googleFontsHref: googleFontsHrefForStudioCatalog(),
    aesthetics,
  });
}
