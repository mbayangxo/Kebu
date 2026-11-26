import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

type Ticket = {
  id: string;
  lines: { menu_item_id: string; quantity: number; name: string }[];
  state: "new" | "preparing";
};
const route = (id: string) => `/business/${id}/retail/kitchen`;

async function kitchenSession(id: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  const auth = await requireUser();
  if ("error" in auth) {
    if (auth.error.status === 401) redirect(`/login?next=${route(id)}`);
    throw new Error("Kitchen authentication is unavailable.");
  }
  const token = (await cookies()).get(`retail-device-${id}`)?.value;
  if (!token) notFound();
  return { db: auth.supabase, fingerprint: createHash("sha256").update(token).digest("hex") };
}

async function advance(id: string, form: FormData) {
  "use server";
  const { db, fingerprint } = await kitchenSession(id);
  const input = z.object({ ticket: z.uuid(), expected_state: z.enum(["new", "preparing"]) }).safeParse(Object.fromEntries(form));
  if (!input.success) redirect(`${route(id)}?result=failed`);
  const { data, error } = await db.rpc("retail_advance_kitchen", { tenant: id, fingerprint, ...input.data });
  redirect(`${route(id)}?result=${error || !data ? "failed" : "saved"}`);
}

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { id } = await params;
  const { db, fingerprint } = await kitchenSession(id);
  const { result } = await searchParams;
  const { data, error } = await db.rpc("retail_kitchen_queue", { tenant: id, fingerprint });
  const tickets = (data ?? []) as Ticket[];

  return <main className="mx-auto max-w-5xl space-y-5 px-5 py-8">
    <header className="flex items-center justify-between gap-4"><h1 className="text-3xl font-semibold">Kitchen queue</h1>
      <a href={route(id)} className="rounded-lg border px-4 py-2">Refresh tickets</a>
    </header>
    {result === "failed" && <p role="alert">Could not advance the ticket. Refresh and check device and staff access.</p>}
    {result === "saved" && <p role="status">Ticket updated.</p>}
    {error ? <p role="alert">Could not load tickets.</p> : !tickets.length ? <p>No paid tickets available on this device.</p> :
      <ul className="grid gap-4 sm:grid-cols-2">{tickets.map(ticket => <li className="space-y-3 rounded-xl border p-4" key={ticket.id}>
        <h2 className="text-lg font-semibold">Order {ticket.id.slice(0, 8)}</h2>
        <p>{ticket.state === "new" ? "New" : "Preparing"}</p>
        <ul>{ticket.lines.map(line => <li key={line.menu_item_id}>{line.quantity} × {line.name}</li>)}</ul>
        <form action={advance.bind(null, id)}>
          <input type="hidden" name="ticket" value={ticket.id} /><input type="hidden" name="expected_state" value={ticket.state} />
          <button className="rounded-lg border px-4 py-2 font-semibold">{ticket.state === "new" ? "Start preparing" : "Mark ready"}</button>
        </form>
      </li>)}</ul>}
  </main>;
}
