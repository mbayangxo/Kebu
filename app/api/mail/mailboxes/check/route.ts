import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { normalizeMailboxLocalPart, PERSONAL_MAIL_DOMAIN } from "@/lib/mail/address";

export const dynamic = "force-dynamic";

function generateSuggestions(base: string): string[] {
  const year = new Date().getFullYear().toString().slice(-2);
  const candidates = [
    base + ".africa",
    base + ".post",
    base + ".ke",
    base + "k",
    base + year,
    base + ".v2",
    base.length > 3 ? base[0] + "." + base.slice(1) : null,
    base + "." + Math.random().toString(36).slice(2, 5),
  ].filter(Boolean) as string[];

  return [...new Set(candidates.map(normalizeMailboxLocalPart))].filter(Boolean).slice(0, 6);
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const local = new URL(req.url).searchParams.get("local")?.trim().toLowerCase() ?? "";
  const normalized = normalizeMailboxLocalPart(local);
  if (!normalized) return NextResponse.json({ error: "Invalid address." }, { status: 422 });

  const address = normalized + "@" + PERSONAL_MAIL_DOMAIN;

  const { data: existing } = await supabase
    .from("mailboxes")
    .select("id")
    .eq("address", address)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ local: normalized, address, available: true, suggestions: [] });
  }

  // Address is taken — find available suggestions.
  const candidates = generateSuggestions(normalized);
  const candidateAddresses = candidates.map(c => c + "@" + PERSONAL_MAIL_DOMAIN);

  const { data: taken } = await supabase
    .from("mailboxes")
    .select("address")
    .in("address", candidateAddresses);

  const takenSet = new Set((taken ?? []).map(r => r.address as string));
  const suggestions = candidates.filter(c => !takenSet.has(c + "@" + PERSONAL_MAIL_DOMAIN));

  return NextResponse.json({ local: normalized, address, available: false, suggestions });
}
