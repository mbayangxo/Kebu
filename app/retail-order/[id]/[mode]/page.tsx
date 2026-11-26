import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "./checkout-form";

const contextSchema = z.object({ id: z.uuid(), mode: z.enum(["register", "kiosk"]) });
type Context = z.infer<typeof contextSchema>;
type MenuItem = { id: string; name: string; version: number; unit_cents: number };
export type CheckoutResult = { id: string; subtotal_cents: number; tax_cents: number; total_cents: number };

async function deviceFingerprint(id: string) {
  const token = (await cookies()).get(`retail-device-${id}`)?.value;
  return token ? createHash("sha256").update(token).digest("hex") : null;
}

async function quote(context: Context, requestId: string, _state: CheckoutResult | null | string, form: FormData) {
  "use server";
  const fingerprint = await deviceFingerprint(context.id);
  if (!fingerprint) return "This browser must be enrolled for this store.";
  const input = Object.fromEntries([...form].filter(([key, value]) => !key.startsWith("$ACTION_") && value !== "" && value !== "0")
    .map(([key, value]) => [key, Number(value)]));
  const cart = z.record(z.uuid(), z.number().int().min(1).max(99)).safeParse(input);
  if (!cart.success || !Object.keys(cart.data).length) return "Enter a quantity between 1 and 99 for at least one item.";
  const db = await createClient();
  const { data, error } = await db.rpc("retail_create_checkout", {
    tenant: context.id, fingerprint, mode: context.mode, request_id: requestId, quantities: cart.data,
  });
  return error ? "Could not price this cart. Check device access and item availability, then reload to start a new cart." : data as CheckoutResult;
}

export default async function Page({ params }: { params: Promise<{ id: string; mode: string }> }) {
  const parsed = contextSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const context = parsed.data;
  const fingerprint = await deviceFingerprint(context.id);
  if (!fingerprint) notFound();
  const db = await createClient();
  const { data, error } = await db.rpc("retail_order_menu", { tenant: context.id, fingerprint, mode: context.mode });
  if (error?.code === "42501") notFound();
  const menu = (data ?? []) as MenuItem[];

  return <main className="mx-auto max-w-4xl space-y-6 px-5 py-8">
    <h1 className="text-3xl font-semibold">{context.mode === "register" ? "Store register" : "Self-service menu"}</h1>
    {context.mode === "register" && <Link className="underline" href={`/business/${context.id}/retail`}>Retail locations</Link>}
    {error ? <p role="alert">Could not load the store menu. Reload to try again.</p> :
      menu.length ? <CheckoutForm menu={menu} action={quote.bind(null, context, randomUUID())} /> :
      <p>The store has no items available to order.</p>}
  </main>;
}
