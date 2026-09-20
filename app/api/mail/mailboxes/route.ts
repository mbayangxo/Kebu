import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { personalMailboxCandidates } from "@/lib/mail/address";

export const dynamic = "force-dynamic";

async function activeBusinessForUser(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
) {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("active_business_id")
    .eq("id", userId)
    .maybeSingle();

  const businessId = profile?.active_business_id ?? null;
  if (!businessId) return null;

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return membership ? businessId : null;
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const activeBusinessId = await activeBusinessForUser(supabase, user.id);

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
      mailboxes: existing ?? [],
    });
  }

  if ((existing ?? []).some((mailbox) => mailbox.mailbox_type === "personal")) {
    return NextResponse.json({ context: "personal", businessId: null, mailboxes: existing ?? [] });
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
    });
    if (!error) break;
    if (error.code !== "23505") {
      return NextResponse.json({ error: "Could not provision your Kebu mailbox." }, { status: 500 });
    }
  }

  const { data: mailboxes, error } = await supabase
    .from("mailboxes")
    .select("id, owner_user_id, business_id, mailbox_type, address, display_name, is_active, created_at")
    .eq("owner_user_id", user.id)
    .is("business_id", null)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not load mailboxes." }, { status: 500 });
  return NextResponse.json({ context: "personal", businessId: null, mailboxes: mailboxes ?? [] });
}
