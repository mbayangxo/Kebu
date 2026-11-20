import { NextResponse } from "next/server";
import { z } from "zod";
import { shopOrderRateLimit } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";
const schema = z.object({ attemptId: z.string().uuid() }).strict();

/** Possession of a high-entropy attempt ID only reveals its minimal receipt.
 * A missing receipt is fenced in SQL, so a delayed original request cannot save later.
 * Never returns payment links, customer details, or a payment-success claim.
 */
export async function POST(req: Request, { params }: { params: Promise<{ subdomain: string }> }) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, {
    status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
  const limited = shopOrderRateLimit(req);
  if (limited) return limited;
  if (req.headers.get("origin") !== new URL(req.url).origin ||
      req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return reply({ error: "Use checkout on this store's website." }, 403);
  }
  const { subdomain } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain) || subdomain.length < 3 || subdomain.length > 63) {
    return reply({ error: "Invalid site address." }, 400);
  }
  // Bounded streaming read; content-length alone is not a trustworthy limit.
  const reader = req.body?.getReader();
  if (!reader) return reply({ error: "Invalid recovery request." }, 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  let body: unknown;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 256) {
        await reader.cancel();
        return reply({ error: "Recovery request is too large." }, 413);
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return reply({ error: "Invalid recovery request." }, 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return reply({ error: "Invalid recovery request." }, 400);
  const admin = createServiceClient();
  if (!admin) return reply({ error: "Recovery is unavailable. Keep this page and try again." }, 503);
  const { data: live, error } = await admin.from("deployments").select("project_id")
    .eq("subdomain", subdomain).eq("status", "live").maybeSingle();
  if (error) return reply({ error: "Could not check the store. Try again." }, 503);
  if (!live?.project_id) return reply({ error: "Store unavailable. Contact the store before ordering again." }, 404);
  const recovered = await admin.rpc("recover_shop_cart_attempt", {
    p_project: live.project_id, p_attempt: parsed.data.attemptId,
  }).then(result => result, () => ({ data: null, error: true }));
  if (recovered.error) return reply({ error: "Checkout is still uncertain. Try checking again before ordering." }, 503);
  if (recovered.data?.state === "saved" && typeof recovered.data.order_number === "string") {
    return reply({ state: "saved", orderNumber: recovered.data.order_number,
      message: `Order ${recovered.data.order_number} was saved. This does not confirm payment. Check your order history or contact the store about payment before ordering again.` });
  }
  if (recovered.data?.state === "closed") return reply({ state: "closed",
    message: "Your previous attempt was not saved and is now closed. You can review your cart and try again." });
  return reply({ error: "Could not confirm checkout. Try checking again." }, 503);
}
