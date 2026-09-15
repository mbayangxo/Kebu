import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

/** Global unread message count for the current user across all their projects. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  // Get all project IDs owned by this user
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.id);

  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);

  if (projectIds.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const { count } = await supabase
    .from("shop_messages")
    .select("id", { count: "exact", head: true })
    .in("project_id", projectIds)
    .eq("read", false)
    .eq("direction", "inbound");

  return NextResponse.json({ count: count ?? 0 });
}
