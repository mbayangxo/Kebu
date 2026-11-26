import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { assertMailboxSendAccess } from "@/lib/mail/business-mail";
import { canonicalAddress } from "@/lib/mail/threading";

export const dynamic = "force-dynamic";

const setSchema = z.object({
  mailboxId: z.string().uuid(),
  forwardToAddress: z.string().trim().email(),
});
const toggleSchema = z.object({
  mailboxId: z.string().uuid(),
  isActive: z.boolean(),
});

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const mailboxId = new URL(req.url).searchParams.get("mailboxId");
  if (!mailboxId || !/^[0-9a-f-]{36}$/i.test(mailboxId)) {
    return NextResponse.json({ error: "Valid mailbox required." }, { status: 400 });
  }

  const mailbox = await assertMailboxSendAccess(supabase, user.id, mailboxId);
  if (!mailbox) return NextResponse.json({ error: "You do not have permission to manage this mailbox." }, { status: 403 });

  const { data, error } = await supabase
    .from("mail_forwarding_rules")
    .select("mailbox_id, forward_to_address, is_active, created_at, updated_at")
    .eq("mailbox_id", mailboxId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load forwarding settings." }, { status: 500 });

  return NextResponse.json({ rule: data ?? null });
}

export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = setSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid forwarding address.", issues: parsed.error.flatten() }, { status: 400 });

  const mailbox = await assertMailboxSendAccess(supabase, user.id, parsed.data.mailboxId);
  if (!mailbox) return NextResponse.json({ error: "You do not have permission to manage this mailbox." }, { status: 403 });

  const forwardTo = canonicalAddress(parsed.data.forwardToAddress);
  if (forwardTo === canonicalAddress(mailbox.address)) {
    return NextResponse.json({ error: "A mailbox cannot forward to itself." }, { status: 400 });
  }

  const { data: rule, error } = await supabase
    .from("mail_forwarding_rules")
    .upsert({
      mailbox_id: mailbox.id,
      forward_to_address: forwardTo,
      is_active: true,
      created_by: user.id,
    }, { onConflict: "mailbox_id" })
    .select("mailbox_id, forward_to_address, is_active, created_at, updated_at")
    .single();

  if (error || !rule) return NextResponse.json({ error: "Could not save forwarding settings." }, { status: 500 });

  await supabase.from("mail_audit_events").insert({
    mailbox_id: mailbox.id,
    business_id: mailbox.business_id ?? null,
    actor_user_id: user.id,
    event_type: "mail.forwarding_configured",
    metadata: { forwardToAddress: forwardTo },
  });

  return NextResponse.json({ rule }, { status: 201 });
}

export async function PATCH(req: Request) {
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const mailbox = await assertMailboxSendAccess(supabase, user.id, parsed.data.mailboxId);
  if (!mailbox) return NextResponse.json({ error: "You do not have permission to manage this mailbox." }, { status: 403 });

  const { data: rule, error } = await supabase
    .from("mail_forwarding_rules")
    .update({ is_active: parsed.data.isActive, updated_at: new Date().toISOString() })
    .eq("mailbox_id", mailbox.id)
    .select("mailbox_id, forward_to_address, is_active, created_at, updated_at")
    .single();

  if (error || !rule) return NextResponse.json({ error: "No forwarding rule to update." }, { status: 404 });
  return NextResponse.json({ rule });
}

export async function DELETE(req: Request) {
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const mailboxId = new URL(req.url).searchParams.get("mailboxId");
  if (!mailboxId || !/^[0-9a-f-]{36}$/i.test(mailboxId)) {
    return NextResponse.json({ error: "Valid mailbox required." }, { status: 400 });
  }

  const mailbox = await assertMailboxSendAccess(supabase, user.id, mailboxId);
  if (!mailbox) return NextResponse.json({ error: "You do not have permission to manage this mailbox." }, { status: 403 });

  await supabase.from("mail_forwarding_rules").delete().eq("mailbox_id", mailbox.id);

  await supabase.from("mail_audit_events").insert({
    mailbox_id: mailbox.id,
    business_id: mailbox.business_id ?? null,
    actor_user_id: user.id,
    event_type: "mail.forwarding_removed",
    metadata: {},
  });

  return NextResponse.json({ ok: true });
}
