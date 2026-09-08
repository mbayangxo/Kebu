import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { createProjectSchema, DEFAULT_HERO_PROPS } from "@/lib/create/schemas";
import { createServiceClient } from "@/lib/opportunity/admin";
import { SHOP_TEAM_ROLES } from "@/lib/create/project-access";

export const dynamic = "force-dynamic";

/** List the signed-in user's projects + shops on businesses they can operate. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, project_type, status, subdomain, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    logCreate("projects.list_failed", { userId: user.id, message: error.message });
    return NextResponse.json(
      {
        error:
          error.message.includes("does not exist") || error.code === "42P01"
            ? "Projects table missing. Apply supabase/migrations/004_create_projects.sql in Supabase."
            : "Could not load projects.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  const byId = new Map(
    (data ?? []).map((p) => [p.id as string, p as Record<string, unknown>]),
  );

  const svc = createServiceClient();
  if (svc) {
    try {
      const { data: memberships } = await svc
        .from("business_members")
        .select("business_id, role")
        .eq("user_id", user.id)
        .eq("status", "active");

      const businessIds = [
        ...new Set(
          (memberships ?? [])
            .filter((m) => (SHOP_TEAM_ROLES as readonly string[]).includes(String(m.role)))
            .map((m) => m.business_id as string)
            .filter(Boolean),
        ),
      ];

      if (businessIds.length) {
        const { data: teamProjects } = await svc
          .from("projects")
          .select("id, title, project_type, status, subdomain, created_at, updated_at")
          .in("business_id", businessIds)
          .order("updated_at", { ascending: false });

        for (const p of teamProjects ?? []) {
          if (!byId.has(p.id as string)) {
            byId.set(p.id as string, p as Record<string, unknown>);
          }
        }
      }
    } catch {
      /* team shops best-effort — owned list still returned */
    }
  }

  const projects = [...byId.values()].sort((a, b) => {
    const au = String(a.updated_at ?? "");
    const bu = String(b.updated_at ?? "");
    return bu.localeCompare(au);
  });

  return NextResponse.json({ projects });
}

/** Create a blank website project with a Home page (no sections yet). */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, projectType } = parsed.data;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title,
      project_type: projectType,
      status: "draft",
    })
    .select("id, title, project_type, status, created_at, updated_at")
    .single();

  if (projectError || !project) {
    logCreate("projects.create_failed", { userId: user.id, message: projectError?.message });
    return NextResponse.json(
      {
        error:
          projectError?.message?.includes("does not exist") || projectError?.code === "42P01"
            ? "Projects table missing. Apply supabase/migrations/004_create_projects.sql in Supabase."
            : "Could not create project.",
        detail: projectError?.message,
      },
      { status: 500 }
    );
  }

  const { data: page, error: pageError } = await supabase
    .from("project_pages")
    .insert({
      project_id: project.id,
      slug: "home",
      title: "Home",
      sort_order: 0,
    })
    .select("id, slug, title, sort_order")
    .single();

  if (pageError || !page) {
    await supabase.from("projects").delete().eq("id", project.id);
    logCreate("projects.page_failed", { userId: user.id, projectId: project.id, message: pageError?.message });
    return NextResponse.json(
      { error: "Could not create home page.", detail: pageError?.message },
      { status: 500 }
    );
  }

  logCreate("projects.created", { userId: user.id, projectId: project.id });
  return NextResponse.json(
    {
      project,
      page,
      defaultHero: DEFAULT_HERO_PROPS,
    },
    { status: 201 }
  );
}
