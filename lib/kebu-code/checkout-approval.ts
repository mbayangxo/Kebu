import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const claims = z.strictObject({
  app: z.uuid(), store: z.uuid(), revision: z.number().int().positive(), expires: z.number().int().positive(),
});
type Claims = z.infer<typeof claims>;
const domain = "kebu-code-shop-review-v1:";
export function checkoutApprovalKey() {
  const key = process.env.KEBU_CODE_CHECKOUT_SIGNING_KEY;
  return key && Buffer.byteLength(key) >= 32 ? key : null;
}
const sign = (payload: string, key: string) => createHmac("sha256", key).update(domain + payload).digest();
export function issueCheckoutApproval(input: Omit<Claims,"expires">, key: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify(claims.parse({ ...input, expires: now + 7 * 86400000 }))).toString("base64url");
  return payload + "." + sign(payload, key).toString("base64url");
}
export function verifyCheckoutApproval(token: string, key: string, now = Date.now()): Claims | null {
  if (!/^[A-Za-z0-9_-]{1,350}\.[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [payload, signature] = token.split(".");
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== 32 || !timingSafeEqual(provided, sign(payload, key))) return null;
  try {
    const result = claims.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    return result.success && result.data.expires > now ? result.data : null;
  } catch { return null; }
}

export const checkoutItems = z.array(z.strictObject({
  productId: z.uuid(), variantId: z.uuid().optional(), quantity: z.number().int().min(1).max(20),
})).min(1).max(12);

export function matchesCheckoutApproval(approval: Claims, workspace: {
  store_project_id: string | null; revision: number; owner_id: string;
}, store: { id: string; owner_id: string; project_type: string; site_password_enabled: boolean }) {
  return workspace.revision === approval.revision && workspace.store_project_id === approval.store &&
    store.id === approval.store && store.owner_id === workspace.owner_id && store.project_type === "store" &&
    store.site_password_enabled === false;
}
