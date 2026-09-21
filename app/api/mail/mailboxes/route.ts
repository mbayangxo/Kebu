import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { PERSONAL_MAIL_DOMAIN, normalizeMailboxLocalPart, personalMailboxCandidates } from "@/lib/mail/address";
import { loadActiveBusinessMailContext } from "@/lib/mail/business-mail";

export const dynamic = "force-dynamic";

const createPersonalMailboxSchema = z.object({
  localPart: z.string().trim().min(2).max(48),
  displayName: z.string().trim().min(1).max(120),
});

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const context = await loadActiveBusinessMailContext(supabase, user.id);
  const activeBusinessId = context.businessId;

  let mailboxQuery = supabase
    .from("mailboxes")
    .select("id, owner_user_id, business_id, mailbox_type, address, display_name, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  mailboxQuery = activeBusinessId
    ? mailboxQuery.eq("business_id", activeBusinessId)
    : mailboxQuery.eq("owner_user_id", user.id).is("business_id", null);

  const { data: existing, error: loadError } = await mailboxQuery;

  if (loadError) {
    return NextResponse.json(
      { error: loadError.message.includes("mailboxes") ? "Apply Kebu Mail migration." : "Could not load mailboxes." },
      { status: 500 },
    );
  }

  if (activeBusinessId) {
    return NextResponse.json({
      context: "business",
      businessId: activeBusinessId,
      businessName: context.businessName,
      role: context.role,
      canManage: context.canManage,
      needsSetup: false,
      mailboxes: existing ?? [],
    });
  }

  if ((existing ?? []).some((mailbox) => mailbox.mailbox_type === "personal")) {
    return NextResponse.json({
      context: "personal",
      businessId: null,
      businessName: null,
      role: null,
      canManage: false,
      needsSetup: false,
      domain: PERSONAL_MAIL_DOMAIN,
      mailboxes: existing ?? [],
    });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name, email")
    .eq("id", user.id)
    .maybeSingle();

  const suggestions = personalMailboxCandidates({
    name: profile?.name,
    email: profile?.email ?? user.email,
    userId: user.id,
  }).map((address) => address.split("@")[0]);

  return NextResponse.json({
    context: "personal",
    businessId: null,
    businessName: null,
    role: null,
    canManage: false,
    needsSetup: true,
    domain: PERSONAL_MAIL_DOMAIN,
    suggestions,
    displayName: profile?.name?.trim() || user.email?.split("@")[0] || "Kebu",
    mailboxes: [],
  });
}

export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const context = await loadActiveBusinessMailContext(supabase, user.id);
  if (context.mode === "business") {
    return NextResponse.json(
      { error: "Switch to Personal Kebu to activate personal Mail." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = createPersonalMailboxSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid email address and display name.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const localPart = normalizeMailboxLocalPart(parsed.data.localPart);
  if (localPart.length < 2) {
    return NextResponse.json({ error: "Choose a longer email name." }, { status: 400 });
  }
  const address = localPart + "@" + PERSONAL_MAIL_DOMAIN;

  const { data: mailbox, error } = await supabase
    .from("mailboxes")
    .insert({
      owner_user_id: user.id,
      business_id: null,
      mailbox_type: "personal",
      address,
      display_name: parsed.data.displayName,
      is_active: true,
    })
    .select("id, owner_user_id, business_id, mailbox_type, address, display_name, is_active, created_at")
    .single();

  if (error?.code === "23505") {
    return NextResponse.json({ error: "That Kebu email address is already taken." }, { status: 409 });
  }
  if (error || !mailbox) {
    return NextResponse.json({ error: "Could not activate Kebu Mail." }, { status: 500 });
  }

  await supabase.from("mail_audit_events").insert({
    mailbox_id: mailbox.id,
    business_id: null,
    actor_user_id: user.id,
    event_type: "personal_mail.mailbox_created",
    metadata: { address },
  });

  return NextResponse.json({ mailbox, context: "personal" }, { status: 201 });
}
