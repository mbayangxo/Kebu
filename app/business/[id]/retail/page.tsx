import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AppShell } from "@/app/components/app-shell";
import { requireUser } from "@/lib/create/auth";
import { canManageRetailLocations, locationInput } from "@/lib/yanmay/retail-locations";

async function retailAccess(businessId: string) {
  if (!z.uuid().safeParse(businessId).success) notFound();
  const auth = await requireUser();
  if ("error" in auth) {
    if (auth.error.status === 401) redirect(`/login?next=/business/${businessId}/retail`);
    throw new Error("Retail authentication is unavailable.");
  }
  const { data, error } = await auth.supabase.from("business_members")
    .select("role").eq("business_id", businessId).eq("user_id", auth.user.id)
    .eq("status", "active").maybeSingle();
  if (error) throw new Error("Could not check retail permissions.");
  if (!canManageRetailLocations(data?.role)) notFound();
  return { db: auth.supabase, canManageStaff: data?.role === "founder" || data?.role === "administrator" };
}

const feedback = {
  created: "Store added.",
  updated: "Store status saved.",
  invalid: "Check the store code, name, address and time zone, then try again.",
  duplicate: "This store code already exists.",
  failed: "Could not save the store. Try again.",
};

async function createLocation(businessId: string, form: FormData) {
  "use server";
  const { db } = await retailAccess(businessId);
  const input = locationInput.safeParse(Object.fromEntries(form));
  if (!input.success) redirect(`/business/${businessId}/retail?result=invalid`);
  const { error } = await db.from("retail_locations").insert({ ...input.data, business_id: businessId });
  const result = error ? (error.code === "23505" ? "duplicate" : "failed") : "created";
  redirect(`/business/${businessId}/retail?result=${result}`);
}

async function setLocationActive(businessId: string, id: string, active: boolean) {
  "use server";
  const { db } = await retailAccess(businessId);
  const { data, error } = await db.from("retail_locations").update({ active })
    .eq("business_id", businessId).eq("id", id).select("id").maybeSingle();
  redirect(`/business/${businessId}/retail?result=${error || !data ? "failed" : "updated"}`);
}

export default async function RetailLocationsPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { id } = await params;
  const { result } = await searchParams;
  const { db, canManageStaff } = await retailAccess(id);
  const { data, error } = await db.from("retail_locations")
    .select("id, code, name, address, timezone, active").eq("business_id", id).order("name").order("id");
  const message = typeof result === "string" && Object.hasOwn(feedback, result)
    ? feedback[result as keyof typeof feedback] : null;

  return (
    <AppShell title="Retail locations">
      <section aria-labelledby="retail-locations-title" className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <header className="space-y-2">
          <Link href={`/business/${id}`} className="text-sm underline">Business dashboard</Link>
          {canManageStaff && <Link href={`/business/${id}/retail/staff`} className="ml-4 text-sm underline">Staff and devices</Link>}
          {canManageStaff && <Link href={`/business/${id}/retail/catalog`} className="ml-4 text-sm underline">Catalog and recipes</Link>}
          <h2 id="retail-locations-title" className="text-3xl font-semibold tracking-tight">Retail locations</h2>
        </header>
        {message && <p role="status">{message}</p>}
        {error && <p role="alert">Could not load stores. <Link className="underline" href={`/business/${id}/retail`}>Retry</Link></p>}
        {data?.length === 0 && <p>Add your first physical store below.</p>}
        {data && data.length > 0 && (
          <ul aria-label="Stores" className="divide-y rounded-xl border px-4">
            {data.map((store) => (
              <li key={store.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <h2 className="font-semibold">{store.name}</h2>
                  <p className="text-sm">{store.code} · {store.active ? "Active" : "Inactive"}</p>
                  <p className="text-sm">{store.address} · {store.timezone}</p>
                </div>
                <form action={setLocationActive.bind(null, id, store.id, !store.active)}>
                  <button className="rounded-lg border px-3 py-2 text-sm" aria-label={`${store.active ? "Deactivate" : "Reactivate"} ${store.name}`}>
                    {store.active ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {!error && (
          <form action={createLocation.bind(null, id)} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
            <h2 className="text-lg font-semibold sm:col-span-2">Add a store</h2>
            {[
              { label: "Store name", name: "name", max: 100 },
              { label: "Store code", name: "code", max: 20 },
              { label: "Address", name: "address", max: 240 },
              { label: "Time zone", name: "timezone", max: 64, placeholder: "America/New_York" },
            ].map((field) => (
              <label key={field.name} className="grid gap-1 text-sm">
                {field.label}
                <input className="rounded-lg border bg-transparent px-3 py-2" name={field.name} maxLength={field.max} required placeholder={field.placeholder} />
              </label>
            ))}
            <button className="justify-self-start rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-950">Add store</button>
          </form>
        )}
      </section>
    </AppShell>
  );
}
