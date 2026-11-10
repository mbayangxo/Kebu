import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

/**
 * Authorizes a client to join a document's live-collaboration Realtime
 * channel (doc-collab:<id>). Access is enforced here via the same RLS
 * `workspace_items` already applies (owner or active business member) —
 * a successful response is what should gate a client ever subscribing to
 * that channel; the channel name itself is not treated as a secret. There
 * is no dedicated Realtime-channel ACL in this project yet (see
 * app/components/rooms/use-mesh-call.ts's own join-gate + heartbeat
 * recheck for the same, already-shipped pattern this mirrors), so a
 * client that skips this check entirely could still reach the channel —
 * closing that requires Supabase Realtime Authorization (RLS on
 * `realtime.messages`), which isn't set up anywhere in this project and
 * can't be verified against this sandbox's local Postgres (the `realtime`
 * schema is part of the hosted Realtime server, not a migratable schema).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const id = (await params).id;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("workspace_items")
    .select("id, kind")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not confirm access." }, { status: 503 });
  if (!data || data.kind !== "doc") {
    return NextResponse.json({ error: "You don't have access to this document." }, { status: 404 });
  }
  // The client needs its own user id/label to join the Realtime channel and
  // label its cursor, but must not fetch that from Supabase Auth directly —
  // this route already resolved the authenticated user server-side, and (as
  // app/components/rooms/use-mesh-call.ts's join route already does for
  // Calls) handing it back here avoids a second, browser-side round trip to
  // a different origin than this app's own, which this app's CSP
  // `connect-src` only allows for `https:` targets — fine for a real hosted
  // Supabase project, not for this sandbox's plain-http local fixtures.
  const label = user.email?.split("@")[0]?.trim() || "Collaborator";
  return NextResponse.json({ ok: true, userId: user.id, label });
}
