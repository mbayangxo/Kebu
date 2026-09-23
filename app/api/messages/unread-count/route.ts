import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

/** Global unread message count for the current user across all their projects.
 *  "Unread" is modelled as open customer threads — shop_message_threads with
 *  status = "open" for any project the user owns. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  // Get all project IDs owned by this user (projects.owner_id, not user_id).
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", user.id);

  if (projectsError) {
    return NextResponse.json({ error: "Could not load projects." }, { status: 500 });
  }

  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);

  if (projectIds.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  // Count open customer threads across all owned stores.
  // shop_message_threads.status = "open" means a customer message is awaiting a reply.
  const { count, error: countError } = await supabase
    .from("shop_message_threads")
    .select("id", { count: "exact", head: true })
    .in("project_id", projectIds)
    .eq("status", "open");

  if (countError) {
    return NextResponse.json({ error: "Could not load message count." }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
