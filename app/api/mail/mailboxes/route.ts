import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { personalMailboxCandidates } from "@/lib/mail/address";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: existing, error: loadError } = await supabase
    .from("mailboxes")
    .select("id, owner_user_id, business_id, mailbox_type, address, display_name, is_active, created_at")
    .order("created_at", { ascending: true });

  if (loadError) {
    return NextResponse.json({ error: loadError.message.includes("mailboxes") ? "Apply Kebu Mail migration." : "Could not load mailboxes." }, { status: 500 });
  }

  if ((existing ?? []).some((mailbox) => mailbox.mailbox_type === "personal")) {
    return NextResponse.json({ mailboxes: existing ?? [] });
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
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not load mailboxes." }, { status: 500 });
  return NextResponse.json({ mailboxes: mailboxes ?? [] });
}
