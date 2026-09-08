import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  STUDIO_TEMPLATES,
  STUDIO_TEMPLATE_CATEGORIES,
  filterStudioTemplates,
  type StudioTemplateCategory,
} from "@/lib/studio/templates";
import { STUDIO_DESIGN_TYPES, type StudioDesignType } from "@/lib/studio/canvas-document";

export const dynamic = "force-dynamic";

/** Public catalog of Studio templates for discovery (auth required). */
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const category = (url.searchParams.get("category") ?? "all") as StudioTemplateCategory | "all";
  const designType = (url.searchParams.get("designType") ?? "all") as StudioDesignType | "all";
  const query = url.searchParams.get("q") ?? "";

  const templates = filterStudioTemplates(STUDIO_TEMPLATES, { category, designType, query });

  return NextResponse.json({
    templates,
    categories: STUDIO_TEMPLATE_CATEGORIES,
    designTypes: STUDIO_DESIGN_TYPES,
    total: STUDIO_TEMPLATES.length,
    matched: templates.length,
  });
}
