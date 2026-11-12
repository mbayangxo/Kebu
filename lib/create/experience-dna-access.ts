import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

export async function authorizeExperienceProject(projectId: string) {
  const auth = await requireUser();
  if ("error" in auth) return { error: auth.error };
  if (!z.string().uuid().safeParse(projectId).success) return { error: NextResponse.json({ error: "Invalid site." }, { status: 400 }) };
  const project = await auth.supabase.from("projects").select("id").eq("id", projectId).eq("owner_id", auth.user.id).maybeSingle();
  if (project.error) return { error: NextResponse.json({ error: "Could not check this site. Retry." }, { status: 503 }) };
  if (!project.data) return { error: NextResponse.json({ error: "Only the site owner can manage private site direction." }, { status: 404 }) };
  return auth;
}
