import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  assertProjectEditorAccess,
  dbForProjectAccess,
} from "@/lib/create/project-access";
import {
  defaultSiteChrome,
  parseSiteChrome,
  patchSiteChromePart,
  siteChromeSchema,
} from "@/lib/create/site-chrome";
import { sectionPropsSchemas } from "@/lib/create/website-schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  header: sectionPropsSchemas.navigation.partial().optional(),
  footer: sectionPropsSchemas.footer.partial().optional(),
});

/** Read universal header/footer chrome for a project. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    select: "id, title, site_chrome",
    action: "site-chrome.get",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const project = access.project;
  let chrome = parseSiteChrome(project.site_chrome);
  if (!chrome.header && !chrome.footer) {
    chrome = defaultSiteChrome(project.title ?? "My site");
  }

  return NextResponse.json({ siteChrome: chrome });
}

/** Update universal header/footer — applies to every page on publish. */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    select: "id, title, site_chrome",
    action: "site-chrome.patch",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const db = dbForProjectAccess(supabase, access.via);
  const project = access.project;

  let chrome = parseSiteChrome(project.site_chrome);
  if (!chrome.header && !chrome.footer) {
    chrome = defaultSiteChrome(project.title ?? "My site");
  }

  if (parsed.data.enabled !== undefined) {
    chrome = { ...chrome, enabled: parsed.data.enabled };
  }
  if (parsed.data.header) {
    chrome = patchSiteChromePart(chrome, "header", parsed.data.header);
  }
  if (parsed.data.footer) {
    chrome = patchSiteChromePart(chrome, "footer", parsed.data.footer);
  }

  const validated = siteChromeSchema.safeParse(chrome);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid site chrome." }, { status: 400 });
  }

  const { data: updated, error } = await db
    .from("projects")
    .update({ site_chrome: validated.data, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select("site_chrome")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      {
        error: error?.message?.includes("site_chrome")
          ? "Apply migration 065_site_chrome.sql."
          : "Could not save site chrome.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ siteChrome: parseSiteChrome(updated.site_chrome) });
}
