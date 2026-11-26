import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AppShell } from "@/app/components/app-shell";
import { requireUser } from "@/lib/create/auth";

type Recipe = { product_id: string; name: string; version: number | null; instructions: string | null };
const route = (id: string) => `/business/${id}/retail/catalog`;

async function getAdminDb(id: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  const auth = await requireUser();
  if ("error" in auth) {
    if (auth.error.status === 401) redirect(`/login?next=${route(id)}`);
    throw new Error("Retail authentication is unavailable.");
  }
  const { data, error } = await auth.supabase.from("business_members").select("role")
    .eq("business_id", id).eq("user_id", auth.user.id).eq("status", "active").maybeSingle();
  if (error) throw new Error("Could not check catalog access.");
  if (data?.role !== "founder" && data?.role !== "administrator") notFound();
  return auth.supabase;
}

async function publish(id: string, form: FormData) {
  "use server";
  const db = await getAdminDb(id);
  const input = z.object({ product: z.uuid(), instructions: z.string().trim().min(1).max(12000) }).safeParse(Object.fromEntries(form));
  if (!input.success) redirect(`${route(id)}?result=invalid`);
  const { error } = await db.rpc("retail_publish_recipe", {
    target_business: id, target_product: input.data.product, recipe_instructions: input.data.instructions,
  });
  redirect(`${route(id)}?result=${error ? "failed" : "published"}`);
}

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { id } = await params;
  const { result } = await searchParams;
  const db = await getAdminDb(id);
  const { data, error } = await db.rpc("retail_recipe_catalog", { target_business: id });
  const rows = (data ?? []) as Recipe[];
  const products = new Map<string, Recipe[]>();
  for (const recipe of rows) {
    const revisions = products.get(recipe.product_id);
    if (revisions) revisions.push(recipe);
    else products.set(recipe.product_id, [recipe]);
  }

  return <AppShell title="Retail catalog">
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8" aria-labelledby="catalog-title">
      <Link href={`/business/${id}/retail`} className="text-sm underline">Retail locations</Link>
      <h2 id="catalog-title" className="text-3xl font-semibold">Catalog and recipes</h2>
      {result === "published" && <p role="status">Recipe version published.</p>}
      {result === "invalid" && <p role="alert">Choose a product and enter recipe instructions.</p>}
      {result === "failed" && <p role="alert">Could not publish the recipe. Try again.</p>}
      {error ? <p role="alert">Could not load the catalog. <Link href={route(id)} className="underline">Retry</Link></p> : <>
        {!products.size && <p>Add a product to a KEBU shop linked to this business to publish its recipe.</p>}
        {[...products].map(([productId, revisions]) => (
          <section className="space-y-3 rounded-xl border p-4" key={productId}>
            <h3 className="text-lg font-semibold">{revisions[0].name}</h3>
            {revisions.filter((revision) => revision.version !== null).map((revision) => (
              <details key={revision.version}>
                <summary className="cursor-pointer">Version {revision.version}</summary>
                <p className="mt-2 whitespace-pre-wrap break-words">{revision.instructions}</p>
              </details>
            ))}
            <form action={publish.bind(null, id)} className="space-y-3">
              <input type="hidden" name="product" value={productId} />
              <label className="grid gap-1">Recipe instructions
                <textarea className="rounded-lg border bg-transparent p-2" name="instructions" required maxLength={12000} rows={4} />
              </label>
              <button className="rounded-lg border px-4 py-2 font-semibold">Publish recipe version</button>
            </form>
          </section>
        ))}
      </>}
    </section>
  </AppShell>;
}
