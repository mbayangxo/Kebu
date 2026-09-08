import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "KEBU-";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function normalizeGiftCardCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export const giftCardInputSchema = z.object({
  initialBalanceXof: z.number().int().min(500).max(10_000_000),
  recipientEmail: z.string().trim().email().max(254).optional(),
  note: z.string().trim().max(200).default(""),
  expiresAt: z.string().datetime().optional(),
});

export type GiftCardRow = {
  id: string;
  project_id: string;
  code: string;
  initial_balance_xof: number;
  balance_xof: number;
  status: string;
  recipient_email: string | null;
  note: string;
  expires_at: string | null;
  created_at: string;
};

export function mapGiftCard(row: GiftCardRow) {
  return {
    id: row.id,
    code: row.code,
    initialBalanceXof: row.initial_balance_xof,
    balanceXof: row.balance_xof,
    status: row.status,
    recipientEmail: row.recipient_email,
    note: row.note,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

/** How much of the gift card covers this order (whole XOF). */
export function giftCardApplyAmount(balanceXof: number, orderTotalXof: number): number {
  if (!Number.isFinite(balanceXof) || !Number.isFinite(orderTotalXof)) return 0;
  if (balanceXof <= 0 || orderTotalXof <= 0) return 0;
  return Math.min(Math.floor(balanceXof), Math.floor(orderTotalXof));
}

export async function resolveActiveGiftCard(
  admin: SupabaseClient,
  projectId: string,
  rawCode: string | undefined | null,
): Promise<
  | { ok: true; card: GiftCardRow }
  | { ok: false; error: string }
  | { ok: true; card: null }
> {
  if (!rawCode?.trim()) return { ok: true, card: null };
  const code = normalizeGiftCardCode(rawCode);
  if (!code) return { ok: true, card: null };

  const { data, error } = await admin
    .from("shop_gift_cards")
    .select(
      "id, project_id, code, initial_balance_xof, balance_xof, status, recipient_email, note, expires_at, created_at",
    )
    .eq("project_id", projectId)
    .eq("code", code)
    .maybeSingle();

  if (error) {
    if (/does not exist|shop_gift_cards/i.test(error.message ?? "")) {
      return {
        ok: false,
        error: "Gift cards need migration 066 — apply APPLY_ALL_NEW_MIGRATIONS_059_066.sql.",
      };
    }
    return { ok: false, error: "Could not check gift card." };
  }
  if (!data) {
    return { ok: false, error: "That gift card code is not valid." };
  }
  if (data.status === "disabled") {
    return { ok: false, error: "That gift card is disabled." };
  }
  if (data.status === "depleted" || (data.balance_xof ?? 0) <= 0) {
    return { ok: false, error: "That gift card has no balance left." };
  }
  if (data.status !== "active") {
    return { ok: false, error: "That gift card is not active." };
  }
  if (data.expires_at && Date.parse(data.expires_at) < Date.now()) {
    return { ok: false, error: "That gift card has expired." };
  }
  return { ok: true, card: data as GiftCardRow };
}

/**
 * Decrement gift card balance after a successful order insert.
 * Rejects if balance changed (race) — caller should surface the error.
 */
export async function redeemGiftCardBalance(
  admin: SupabaseClient,
  cardId: string,
  expectedBalance: number,
  amountXof: number,
): Promise<{ ok: true; remaining: number } | { ok: false; error: string }> {
  if (amountXof <= 0) return { ok: true, remaining: expectedBalance };
  const remaining = expectedBalance - amountXof;
  if (remaining < 0) {
    return { ok: false, error: "Gift card balance is too low." };
  }
  const nextStatus = remaining === 0 ? "depleted" : "active";
  const { data, error } = await admin
    .from("shop_gift_cards")
    .update({
      balance_xof: remaining,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId)
    .eq("balance_xof", expectedBalance)
    .eq("status", "active")
    .select("balance_xof")
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Could not redeem gift card." };
  }
  if (!data) {
    return { ok: false, error: "Gift card was just used — try again with current balance." };
  }
  return { ok: true, remaining: data.balance_xof as number };
}
