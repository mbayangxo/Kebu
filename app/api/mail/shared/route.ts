import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { loadActiveBusinessMailContext } from "@/lib/mail/business-mail";
import { normalizeMailboxLocalPart } from "@/lib/mail/address";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    mailDomainId: z.string().uuid(),
    localPart: z.string().trim().min(1).max(48),
    displayName: z.string().trim().min(1).max(120),
  }),
  z.object({
    action: z.literal("add_member"),
    mailboxId: z.string().uuid(),
    userId: z.string().uuid(),
    role: z.enum(["manager", "member"]).default("member"),
  }),
  z.object({
    action: z.literal("update_role"),
    mailboxId: z.string().uuid(),
    userId: z.string().uuid(),
    role: z.enum(["manager", "member"]),
  }),
  z.object({
    action: z.literal("remove_member"),
    mailboxId: z.string().uuid(),
    userId: z.string().uuid(),
  }),
]);

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Mirrors public.can_manage_mail_shared_access() in JS, the same way
 * lib/mail/business-mail.ts's assertMailboxSendAccess() mirrors
 * can_manage_business_mail() rather than calling it via .rpc() — this
 * codebase's existing convention for Mail authorization checks, and the
 * one that actually works against the PostgREST-only (no /rpc/*) local
 * test fixture. RLS (can_manage_mail_shared_access itself, used by the
 * mail_shared_access policies) is the real enforcement; this is the
 * honest-error-message layer in front of it.
 */
async function canManageThisMailbox(
  supabase: Supabase,
  mailboxId: string,
  userId: string,
  isBusinessMailAdmin: boolean,
): Promise<boolean> {
  if (isBusinessMailAdmin) return true;
  const { data } = await supabase
    .from("mail_shared_access")
    .select("role")
    .eq("mailbox_id", mailboxId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role === "manager";
}

/**
 * GET returns every shared mailbox RLS lets the caller see (membership or
 * business-admin fallback — can_access_mailbox decides, not this route), each
 * annotated with whether the caller can manage its roster. For a mailbox the
 * caller can manage, the response also includes its current members and the
 * business teammates still eligible to be added (active members not already
 * on the roster) — kept in one round trip so the UI never needs a second
 * fetch to render the management panel.
 */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const context = await loadActiveBusinessMailContext(supabase, user.id);
  if (context.mode !== "business" || !context.businessId) {
    return NextResponse.json({ error: "Switch to a Business Kebu to manage shared mailboxes." }, { status: 409 });
  }

  const { data: mailboxes, error: mailboxError } = await supabase
    .from("mailboxes")
    .select("id, address, display_name, is_active, created_at")
    .eq("business_id", context.businessId)
    .eq("mailbox_type", "shared")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (mailboxError) {
    return NextResponse.json({ error: "Could not load shared mailboxes." }, { status: 500 });
  }

  const results = await Promise.all(
    (mailboxes ?? []).map(async (mailbox) => {
      const canManage = await canManageThisMailbox(supabase, mailbox.id, user.id, context.canManage);
      if (!canManage) {
        return { ...mailbox, canManage, members: [], candidates: [] };
      }

      const { data: memberRows } = await supabase
        .from("mail_shared_access")
        .select("user_id, role, created_at")
        .eq("mailbox_id", mailbox.id)
        .order("created_at", { ascending: true });

      const memberIds = (memberRows ?? []).map((row) => row.user_id);
      const { data: memberProfiles } = memberIds.length
        ? await supabase.from("user_profiles").select("id, name, email").in("id", memberIds)
        : { data: [] };
      const profileById = new Map((memberProfiles ?? []).map((profile) => [profile.id, profile]));

      const members = (memberRows ?? []).map((row) => ({
        userId: row.user_id,
        role: row.role as "manager" | "member",
        name: profileById.get(row.user_id)?.name ?? null,
        email: profileById.get(row.user_id)?.email ?? null,
        createdAt: row.created_at,
      }));

      const { data: activeMembers } = await supabase
        .from("business_members")
        .select("user_id")
        .eq("business_id", context.businessId)
        .eq("status", "active");

      const existingUserIds = new Set(memberIds);
      const candidateIds = (activeMembers ?? [])
        .map((row) => row.user_id)
        .filter((id) => !existingUserIds.has(id));
      const { data: candidateProfiles } = candidateIds.length
        ? await supabase.from("user_profiles").select("id, name, email").in("id", candidateIds)
        : { data: [] };

      const candidates = (candidateProfiles ?? []).map((profile) => ({
        userId: profile.id,
        name: profile.name ?? null,
        email: profile.email ?? null,
      }));

      return { ...mailbox, canManage, members, candidates };
    }),
  );

  return NextResponse.json({ businessId: context.businessId, canCreate: context.canManage, mailboxes: results });
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
  if (context.mode !== "business" || !context.businessId) {
    return NextResponse.json({ error: "Switch to a Business Kebu first." }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid shared mailbox request.", issues: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "create") {
    if (!context.canManage) {
      return NextResponse.json({ error: "Your business role cannot create shared mailboxes." }, { status: 403 });
    }

    const { data: mailDomain } = await supabase
      .from("mail_domains")
      .select("id, domain, status")
      .eq("id", parsed.data.mailDomainId)
      .eq("business_id", context.businessId)
      .eq("status", "verified")
      .maybeSingle();

    if (!mailDomain) {
      return NextResponse.json({ error: "Verify the business mail domain before creating a shared address." }, { status: 409 });
    }

    const localPart = normalizeMailboxLocalPart(parsed.data.localPart);
    const address = localPart + "@" + mailDomain.domain;

    const { data: mailbox, error: mailboxError } = await supabase
      .from("mailboxes")
      .insert({
        owner_user_id: null,
        business_id: context.businessId,
        mailbox_type: "shared",
        address,
        display_name: parsed.data.displayName,
        mail_domain_id: mailDomain.id,
        local_part: localPart,
        is_active: true,
      })
      .select("*")
      .single();

    if (mailboxError?.code === "23505") {
      return NextResponse.json({ error: "That shared email address already exists." }, { status: 409 });
    }
    if (mailboxError || !mailbox) {
      return NextResponse.json({ error: "Could not create shared mailbox." }, { status: 500 });
    }

    const { error: membershipError } = await supabase.from("mail_shared_access").insert({
      mailbox_id: mailbox.id,
      user_id: user.id,
      role: "manager",
      added_by: user.id,
    });
    if (membershipError) {
      return NextResponse.json({ error: "Shared mailbox created, but could not add you as its manager." }, { status: 500 });
    }

    await supabase.from("mail_audit_events").insert({
      mailbox_id: mailbox.id,
      business_id: context.businessId,
      actor_user_id: user.id,
      event_type: "shared_mailbox.created",
      metadata: { address },
    });

    return NextResponse.json({ mailbox }, { status: 201 });
  }

  const { mailboxId } = parsed.data;
  const { data: mailbox } = await supabase
    .from("mailboxes")
    .select("id, business_id, mailbox_type, address")
    .eq("id", mailboxId)
    .eq("business_id", context.businessId)
    .eq("mailbox_type", "shared")
    .maybeSingle();
  if (!mailbox) {
    return NextResponse.json({ error: "Shared mailbox not found in this Business Kebu." }, { status: 404 });
  }

  const canManageMailbox = await canManageThisMailbox(supabase, mailboxId, user.id, context.canManage);
  if (!canManageMailbox) {
    return NextResponse.json({ error: "Your role cannot manage this shared mailbox's team." }, { status: 403 });
  }

  if (parsed.data.action === "add_member") {
    const { data: targetMember } = await supabase
      .from("business_members")
      .select("user_id")
      .eq("business_id", context.businessId)
      .eq("user_id", parsed.data.userId)
      .eq("status", "active")
      .maybeSingle();
    if (!targetMember) {
      return NextResponse.json({ error: "That person isn't an active member of this Business Kebu." }, { status: 409 });
    }

    const { error } = await supabase.from("mail_shared_access").insert({
      mailbox_id: mailboxId,
      user_id: parsed.data.userId,
      role: parsed.data.role,
      added_by: user.id,
    });
    if (error?.code === "23505") {
      return NextResponse.json({ error: "That person already has access to this mailbox." }, { status: 409 });
    }
    if (error) {
      return NextResponse.json({ error: "Could not add that person to the shared mailbox." }, { status: 500 });
    }

    await supabase.from("mail_audit_events").insert({
      mailbox_id: mailboxId,
      business_id: context.businessId,
      actor_user_id: user.id,
      event_type: "shared_mailbox.member_added",
      metadata: { address: mailbox.address, targetUserId: parsed.data.userId, role: parsed.data.role },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (parsed.data.action === "update_role") {
    const { error } = await supabase
      .from("mail_shared_access")
      .update({ role: parsed.data.role })
      .eq("mailbox_id", mailboxId)
      .eq("user_id", parsed.data.userId);
    if (error) {
      return NextResponse.json({ error: "Could not update that person's role." }, { status: 500 });
    }
    await supabase.from("mail_audit_events").insert({
      mailbox_id: mailboxId,
      business_id: context.businessId,
      actor_user_id: user.id,
      event_type: "shared_mailbox.member_role_changed",
      metadata: { address: mailbox.address, targetUserId: parsed.data.userId, role: parsed.data.role },
    });
    return NextResponse.json({ ok: true });
  }

  // remove_member
  const { error } = await supabase
    .from("mail_shared_access")
    .delete()
    .eq("mailbox_id", mailboxId)
    .eq("user_id", parsed.data.userId);
  if (error) {
    return NextResponse.json({ error: "Could not remove that person from the shared mailbox." }, { status: 500 });
  }
  await supabase.from("mail_audit_events").insert({
    mailbox_id: mailboxId,
    business_id: context.businessId,
    actor_user_id: user.id,
    event_type: "shared_mailbox.member_removed",
    metadata: { address: mailbox.address, targetUserId: parsed.data.userId },
  });
  return NextResponse.json({ ok: true });
}
