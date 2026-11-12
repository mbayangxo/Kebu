import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import * as Y from "yjs";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { plainTextToRichDocument, extractPlainText } from "@/lib/work/rich-text";
import { prosemirrorJSONToYDoc } from "y-prosemirror";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

/** RLS-gated document metadata. Live state is bootstrapped atomically by POST. */
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

/** Select one durable CRDT history before any client subscribes or edits. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.from("workspace_items").select("id, kind, rich_content, body, updated_at, collab_state, collab_epoch").eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ error: "Live editing is unavailable; use regular autosave." }, { status: 503 });
    if (!data || data.kind !== "doc") return NextResponse.json({ error: "Document not found." }, { status: 404 });
    let state = data.collab_state as string | null;
    let epoch = data.collab_epoch as string | null;
    if (!state || !epoch) {
      epoch = crypto.randomUUID();
      const schema = getSchema([StarterKit.configure({ history: false }), Link]);
      const content = schema.nodeFromJSON(data.rich_content ?? plainTextToRichDocument(data.body ?? "")).toJSON();
      const doc = prosemirrorJSONToYDoc(schema, content, "default");
      state = Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64"); doc.destroy();
      const result = await supabase.from("workspace_items").update({ collab_state: state, collab_epoch: epoch, collab_write_id: crypto.randomUUID(), rich_content: content, body: extractPlainText(content) }).eq("id", id).eq("updated_at", data.updated_at).is("collab_state", null).select("id").maybeSingle();
      if (result.error) return NextResponse.json({ error: "Could not initialize live editing." }, { status: 503 });
      if (!result.data) continue;
    }
    return NextResponse.json({ userId: user.id, label: user.email?.split("@")[0] || "Collaborator", state, epoch });
  }
  return NextResponse.json({ error: "Document changed while connecting. Please retry." }, { status: 409 });
}
