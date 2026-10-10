import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { giftPublicPath } from "@/lib/shop/gift-order";

export function checkoutRequestBinding(input: Record<string, unknown>) {
  if (typeof input.requestId !== "string") return null;
  const stable = { ...input };
  delete stable.emailVerificationToken;
  return { requestId: input.requestId, fingerprint: createHash("sha256").update(JSON.stringify(stable)).digest("hex") };
}

export async function lookupCheckoutRetry(admin: SupabaseClient, projectId: string, binding: ReturnType<typeof checkoutRequestBinding>) {
  if (!binding) return { data: null, error: null };
  const { data, error } = await admin.rpc("lookup_shop_checkout_request", {
    p_project_id: projectId, p_request_id: binding.requestId, p_fingerprint: binding.fingerprint,
  });
  const receipt = data && typeof data.giftPublicId === "string" ? { ...data, giftPath: giftPublicPath(data.giftPublicId) } : data;
  return { data: receipt, error: error ? error.message === "Checkout request changed. Start a new checkout."
    ? error.message : "Could not check the previous checkout. Please try again." : null };
}
