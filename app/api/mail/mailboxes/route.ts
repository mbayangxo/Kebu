import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { personalMailboxCandidates, normalizeMailboxLocalPart, PERSONAL_MAIL_DOMAIN } from "@/lib/mail/address";
import { loadActiveBusinessMailContext } from "@/lib/mail/business-mail";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  localPart: z.string().min(1).max(48),
  displayName: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { localPart, displayName } = parsed.data;
  const normalized = normalizeMailboxLocalPart(localPart);
  if (!normalized) return NextResponse.json({ error: "That address is not allowed." }, { status: 422 });

  const address = normalized + "@" + PERSONAL_MAIL_DOMAIN;

  const { data: profile } = await supabase
    .from("user_profiles").select("name").eq("id", user.id).maybeSingle();
  const finalDisplayName = (displayName?.trim() || profile?.name?.trim() || user.email?.split("@")[0] || "Kebu").slice(0, 80);

  const { data: created, error } = await supabase
    .from("mailboxes")
    .insert({
      owner_user_id: user.id,
      business_id: null,
      mailbox_type: "personal",
      address,
      display_name: finalDisplayName,
      is_default: false,
    })
    .select("id, address, display_name, mailbox_type, business_id, is_default")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "That address is already taken." }, { status: 409 });
    return NextResponse.json({ error: "Could not create mailbox." }, { status: 500 });
  }

  return NextResponse.json({ mailbox: created });
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const context = await loadActiveBusinessMailContext(supabase, user.id);
  const activeBusinessId = context.businessId;

  let mailboxQuery = supabase
    .from("mailboxes")
    .select("id, owner_user_id, business_id, mailbox_type, address, display_name, is_active, is_default, created_at")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
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
      mailboxes: existing ?? [],
    });
  }

  if ((existing ?? []).some((mailbox) => mailbox.mailbox_type === "personal")) {
    return NextResponse.json({ context: "personal", businessId: null, businessName: null, role: null, canManage: false, mailboxes: existing ?? [] });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name, email")
    .eq("id", user.id)
    .maybeSingle();

  const candidates = personalMailboxCandidates({
    name: profile?.name,
    email: profile?.email ?? user.email,
    userId: user.id,
  });

  for (const address of candidates) {
    const { error } = await supabase.from("mailboxes").insert({
      owner_user_id: user.id,
      business_id: null,
      mailbox_type: "personal",
      address,
      display_name: profile?.name?.trim() || user.email?.split("@")[0] || "Kebu",
      is_default: true,
    });
    if (!error) break;
    if (error.code !== "23505") {
      return NextResponse.json({ error: "Could not provision your Kebu mailbox." }, { status: 500 });
    }
  }

  const { data: mailboxes, error } = await supabase
    .from("mailboxes")
    .select("id, owner_user_id, business_id, mailbox_type, address, display_name, is_active, is_default, created_at")
    .eq("owner_user_id", user.id)
    .is("business_id", null)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not load mailboxes." }, { status: 500 });
  return NextResponse.json({ context: "personal", businessId: null, businessName: null, role: null, canManage: false, mailboxes: mailboxes ?? [] });
}
