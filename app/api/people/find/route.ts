import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";

import { builderRateLimit } from "@/lib/api-guard";
import { builtinAccess, builtinsEnabled } from "@/lib/live/app-access";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const q = new URL(req.url).searchParams.get("q")?.trim().toUpperCase() ?? "";
  if (/^@[A-Z0-9_]{3,24}$/.test(q) && builtinsEnabled()) {
    const limited = builderRateLimit(req);
    if (limited) return limited;
    const friends = await builtinAccess("friends");
    const live = friends.installed ? null : await builtinAccess("live-rooms");
    if (!friends.installed && !live?.installed) return NextResponse.json({ person: null });
    const admin = createServiceClient();
    if (!admin) return NextResponse.json({ error: "People lookup is unavailable." }, { status: 503 });
    const { data: profile, error } = await admin.from("kebu_friends_profiles")
      .select("user_id,username,display_name,bio").eq("discoverable", true)
      .eq("username", q.slice(1).toLowerCase()).neq("user_id", auth.user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Could not search Friends." }, { status: 503 });
    if (!profile) return NextResponse.json({ person: null });
    const { data: blocked, error: blockError } = await auth.supabase.from("personal_connections")
      .select("id").eq("status", "blocked")
      .or(`and(requester_id.eq.${auth.user.id},addressee_id.eq.${profile.user_id}),and(requester_id.eq.${profile.user_id},addressee_id.eq.${auth.user.id})`)
      .maybeSingle();
    if (blockError) return NextResponse.json({ error: "Could not search Friends." }, { status: 503 });
    if (blocked) return NextResponse.json({ person: null });
    const { data: added, error: installError } = await admin.from("kebu_builtin_app_installs")
      .select("app_key").eq("user_id", profile.user_id).eq("app_key", "friends").maybeSingle();
    if (installError) return NextResponse.json({ error: "Could not search Friends." }, { status: 503 });
    return NextResponse.json({ person: added ? {
      id: profile.user_id, name: profile.display_name, bio: profile.bio, avatar_url: null, public_kebu_id: "@" + profile.username,
    } : null }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (!/^KBU-P-[A-F0-9]{10}$/.test(q)) {
    return NextResponse.json({ person: null });
  }

  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "People lookup is unavailable." }, { status: 503 });

  const { data, error } = await admin
    .from("user_profiles")
    .select("id, name, avatar_url, public_kebu_id")
    .eq("public_kebu_id", q)
    .neq("id", auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not search People." }, { status: 500 });
  return NextResponse.json({ person: data ?? null });
}
