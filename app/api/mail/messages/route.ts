import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

const folderSchema = z.enum(["inbox","sent","drafts","archive","spam","trash"]);

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const url = new URL(req.url);
  const mailboxId = url.searchParams.get("mailboxId");
  const folder = folderSchema.safeParse(url.searchParams.get("folder") || "inbox");
  if (!mailboxId || !/^[0-9a-f-]{36}$/i.test(mailboxId) || !folder.success) {
    return NextResponse.json({ error: "Valid mailbox and folder required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("mail_messages")
    .select("id, mailbox_id, thread_id, direction, folder, from_address, to_addresses, cc_addresses, subject, body_text, status, read_at, created_at")
    .eq("mailbox_id", mailboxId)
    .eq("folder", folder.data)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: "Could not load messages." }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  folder: folderSchema.optional(),
  read: z.boolean().optional(),
}).refine((value) => value.folder !== undefined || value.read !== undefined);

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid message update." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (parsed.data.folder) patch.folder = parsed.data.folder;
  if (parsed.data.read !== undefined) patch.read_at = parsed.data.read ? new Date().toISOString() : null;
  const { data, error } = await supabase.from("mail_messages").update(patch).eq("id", parsed.data.id).select("*").single();
  if (error) return NextResponse.json({ error: "Could not update message." }, { status: 500 });
  return NextResponse.json({ message: data });
}
