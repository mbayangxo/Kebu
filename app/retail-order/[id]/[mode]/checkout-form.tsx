"use client";

import { useActionState } from "react";

type MenuItem = { id: string; name: string; version: number; unit_cents: number };
type Quote = { id: string; subtotal_cents: number; tax_cents: number; total_cents: number };
type State = Quote | string | null;
const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (cents: number) => dollars.format(cents / 100);

export function CheckoutForm({ menu, action }: {
  menu: MenuItem[];
  action: (state: State, form: FormData) => Promise<State>;
}) {
  const [state, submit, pending] = useActionState(action, null);
  if (state && typeof state !== "string") return <section className="space-y-4 rounded-xl border p-5" aria-label="Checkout total">
    <h2 className="text-xl font-semibold">Order total</h2>
    <dl className="grid grid-cols-2 gap-2">
      <dt>Subtotal</dt><dd className="text-right">{money(state.subtotal_cents)}</dd>
      <dt>Tax</dt><dd className="text-right">{money(state.tax_cents)}</dd>
      <dt className="font-semibold">Total</dt><dd className="text-right font-semibold">{money(state.total_cents)}</dd>
    </dl>
    <p>Payment is unavailable. This cart has been priced and has no payment or kitchen ticket.</p>
    <a href="" className="underline">Start a new cart</a>
  </section>;

  return <form action={submit} className="space-y-4">
    {typeof state === "string" && <p role="alert">{state}</p>}
    <ul className="divide-y rounded-xl border px-4">
      {menu.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div><h2 className="font-semibold">{item.name}</h2><p>{money(item.unit_cents)}</p></div>
        <label className="flex items-center gap-2">Quantity
          <input aria-label={`Quantity for ${item.name}, revision ${item.version}`} className="w-24 rounded-lg border bg-transparent p-3" name={item.id} type="number" min="0" max="99" defaultValue="0" />
        </label>
      </li>)}
    </ul>
    <button className="rounded-lg border px-5 py-3 font-semibold" disabled={pending}>{pending ? "Calculating…" : "Review total"}</button>
  </form>;
}
