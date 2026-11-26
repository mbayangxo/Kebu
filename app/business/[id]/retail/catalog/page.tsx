import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AppShell } from "@/app/components/app-shell";
import { requireUser } from "@/lib/create/auth";

type Recipe = { product_id: string; name: string; version: number | null; instructions: string | null };
type MenuRecipe = { id: string; name: string; version: number };
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

async function saveMenu(id: string, form: FormData) {
  "use server";
  const db = await getAdminDb(id);
  const input = z.object({
    store: z.uuid(), recipe: z.uuid(),
    price: z.string().regex(/^[1-9]\d{0,6}$/).transform(Number).pipe(z.number().max(1000000)),
    rate: z.string().regex(/^\d{1,5}$/).transform(Number).pipe(z.number().max(10000)),
  }).safeParse(Object.fromEntries(form));
  if (!input.success) redirect(`${route(id)}?result=menu-invalid`);
  const { error } = await db.rpc("retail_set_menu_item", input.data);
  redirect(`${route(id)}?result=${error ? "failed" : "menu-saved"}`);
}

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { id } = await params;
  const { result } = await searchParams;
  const db = await getAdminDb(id);
  const [catalog, stores, menuRecipes, menuItems] = await Promise.all([
    db.rpc("retail_recipe_catalog", { target_business: id }),
    db.from("retail_locations").select("id,name").eq("business_id", id).eq("active", true).order("name"),
    db.rpc("retail_menu_recipes", { tenant: id }),
    db.from("retail_menu_items").select("id,location_id,recipe_id,unit_cents,tax_bps").eq("business_id", id),
  ]);
  const { data, error } = catalog;
  const recipes = (menuRecipes.data ?? []) as MenuRecipe[];
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
      {result === "menu-saved" && <p role="status">Store menu item saved.</p>}
      {result === "menu-invalid" && <p role="alert">Check the store, recipe, price in cents, and tax rate in basis points.</p>}
      <section className="space-y-3 rounded-xl border p-4">
        <h3 className="text-lg font-semibold">Store menus</h3>
        {stores.error || menuRecipes.error || menuItems.error ? <p role="alert">Could not load store menus.</p> : <>
          <ul className="divide-y">
            {menuItems.data?.map(item => {
              const recipe = recipes.find(row => row.id === item.recipe_id);
              const store = stores.data?.find(row => row.id === item.location_id);
              return <li className="py-2" key={item.id}>{store?.name ?? "Inactive store"} · {recipe?.name ?? "Unavailable product"}{recipe && ` v${recipe.version}`} · ${(item.unit_cents / 100).toFixed(2)} · {item.tax_bps / 100}% tax</li>;
            })}
          </ul>
          {stores.data?.length && recipes.length ? <form action={saveMenu.bind(null, id)} className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">Store<select required name="store" className="rounded-lg border bg-transparent p-2">
              {stores.data.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select></label>
            <label className="grid gap-1">Recipe version<select required name="recipe" className="rounded-lg border bg-transparent p-2">
              {recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name} · Version {recipe.version}</option>)}
            </select></label>
            <label className="grid gap-1">Price in USD cents<input required type="number" min="1" max="1000000" name="price" className="rounded-lg border bg-transparent p-2" /></label>
            <label className="grid gap-1">Tax rate in basis points<input required type="number" min="0" max="10000" name="rate" className="rounded-lg border bg-transparent p-2" /></label>
            <button className="w-fit rounded-lg border px-4 py-2 font-semibold">Save menu item</button>
          </form> : <p>Add an active store and publish a recipe version to set up its menu.</p>}
        </>}
      </section>
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
