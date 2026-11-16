import { readCompanyJson } from "@/lib/company/read-request";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { teamMembership } from "@/lib/business/team-permissions";
import { companyActionSchema, companyPortalEnabled } from "@/lib/company/model";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
const reply = (data: object, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
type Params = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Params) {
  if (!companyPortalEnabled())
    return reply({ error: "The company workplace is not enabled here." }, 503);
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const membership = await teamMembership(auth.supabase, id, auth.user.id);
  if (membership.error)
    return reply({ error: "Could not verify company access." }, 503);
  if (!membership.role) return reply({ error: "Company not found." }, 404);
  const db = auth.supabase;
  const [roster, lessons, ...results] = await Promise.all([
    db.rpc("company_roster", { p_business: id }),
    db.rpc("company_learning_for_me", { p_business: id }),
    ...[
      "company_projects",
      "company_project_tasks",
      "company_project_feedback",
      "company_project_resources",
      "company_learning_modules",
      "company_learning_assignments",
      "company_learning_attempts",
      "company_hr_requests",
      "company_shifts",
      "company_benefits",
      "company_pay_preferences",
      "company_pay_statements",
    ].map((table) =>
      db.from(table).select("*").eq("business_id", id).limit(101),
    ),
  ]);
  if (roster.error || lessons.error || results.some((r) => r.error))
    return reply(
      {
        error:
          "Could not load the workplace. Your data has not been replaced. Please retry.",
      },
      503,
    );
  const [
    projects,
    tasks,
    feedback,
    resources,
    modules,
    assignments,
    attempts,
    hr,
    shifts,
    benefits,
    preferences,
    statements,
  ] = results.map((r) => (r.data ?? []).slice(0, 100));
  const [documents, files] = await Promise.all([
    db
      .from("workspace_items")
      .select("id,title,kind")
      .eq("business_id", id)
      .eq("kind", "doc")
      .eq("visibility", "team")
      .limit(100),
    db
      .from("library_nodes")
      .select("id,title,kind")
      .in("kind", ["sheet", "slide"])
      .is("trashed_at", null)
      .limit(100),
  ]);
  if (documents.error || files.error)
    return reply({ error: "Could not load working documents." }, 503);
  const availableResources = [...(documents.data ?? []), ...(files.data ?? [])];
  const work = tasks.length
    ? await db
        .from("workspace_items")
        .select("id,title,body,status,due_at")
        .eq("business_id", id)
        .in(
          "id",
          tasks.map((t) => t.id),
        )
    : { data: [], error: null };
  if (work.error)
    return reply({ error: "Could not load project assignments." }, 503);
  const workById = new Map((work.data ?? []).map((w) => [w.id, w]));
  return reply({
    availableResources,
    role: membership.role,
    userId: auth.user.id,
    members: roster.data,
    lessons: lessons.data,
    projects,
    tasks: tasks
      .filter((t) => workById.has(t.id))
      .map((t) => ({ ...t, ...workById.get(t.id) })),
    feedback,
    resources,
    modules: modules.map((m) => ({ id: m.id, title: m.title })),
    assignments,
    attempts,
    hr,
    shifts,
    benefits,
    preferences,
    statements,
    limited: results.some((r) => (r.data?.length ?? 0) > 100),
  });
}
export async function POST(req: Request, { params }: Params) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const limited = builderRateLimit(req);
  if (limited) return limited;
  if (!companyPortalEnabled())
    return reply({ error: "The company workplace is not enabled here." }, 503);
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await readCompanyJson(req);
  const parsed = companyActionSchema.safeParse(body);
  if (!parsed.success)
    return reply({ error: "Check the required fields and try again." }, 400);
  const { action, ...data } = parsed.data;
  const r = await auth.supabase.rpc("company_portal_action", {
    p_business: id,
    p_action: action,
    p_data: data,
  });
  if (r.error)
    return reply(
      {
        error:
          r.error.code === "42501"
            ? "You no longer have permission for this action."
            : "Could not save this change. Check company membership, dates and current record status; reload before retrying.",
        retrySafe: true,
      },
      r.error.code === "42501" ? 403 : 409,
    );
  return reply(r.data);
}
