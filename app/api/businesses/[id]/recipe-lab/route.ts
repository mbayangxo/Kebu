import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
import { requireUser } from "@/lib/create/auth";
import { calculateRecipe, formulaSchema, recipeIngredientSchema, type RecipeIngredient } from "@/lib/business/recipe-lab";

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
type Context = { params: Promise<{ id: string }> };
const label = z.string().trim().min(1).max(120);
const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ingredient"), ingredient: recipeIngredientSchema }),
  z.object({ type: z.literal("formula"), formula: formulaSchema }),
  z.object({ type: z.literal("receipt"), ingredient: z.uuid(), supplier: label, invoice: label, line: z.number().int().positive().max(100000), lot: label, grams: z.number().int().positive().max(50000000), cost: z.number().int().min(0).max(100000000000) }),
  z.object({ type: z.literal("batch"), batchId: z.uuid(), formulaId: z.uuid(), label, lots: z.array(z.object({lot_id:z.uuid(),grams:z.number().int().positive().max(50000000)})).min(1).max(100) }),
]);

async function lab(ctx: Context) {
  const auth = await requireUser();
  if ("error" in auth) return auth;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return { error: json({ error: "Business not found." }, 404) };
  const { data, error } = await auth.supabase.from("business_members").select("role").eq("business_id", id)
    .eq("user_id", auth.user.id).eq("status", "active").in("role", ["founder", "cofounder"]).maybeSingle();
  if (error) return { error: json({ error: "Could not verify Recipe Lab access." }, 503) };
  if (!data) return { error: json({ error: "Recipe Lab is available to company founders." }, 403) };
  return { db: auth.supabase, id };
}
export async function GET(_req: Request, ctx: Context) {
  const access = await lab(ctx);
  if ("error" in access) return access.error;
  const { db, id } = access;
  const [ingredients, formulas, lots, batches] = await Promise.all([
    db.from("business_recipe_ingredients").select("id,name,currency,cost_minor_per_kg").eq("business_id", id).order("name").limit(500),
    db.from("business_recipe_formulas").select("id,name,configuration,created_at").eq("business_id", id).order("created_at", { ascending: false }).limit(100),
    db.from("business_recipe_lots").select("*").eq("business_id",id).order("received_at",{ascending:false}).limit(500),
    db.from("business_recipe_batches").select("*").eq("business_id",id).order("recorded_at",{ascending:false}).limit(100),
  ]);
  if (ingredients.error || formulas.error || lots.error || batches.error) return json({ error: "Recipe Lab could not load." }, 503);
  return json({ ingredients: ingredients.data, lots: lots.data, batches: batches.data, formulas: formulas.data.flatMap(row => {
    const f = formulaSchema.safeParse(row.configuration);
    return f.success ? [{ id: row.id, createdAt: row.created_at, formula: f.data }] : [];
  }) });
}
export async function POST(req: Request, ctx: Context) {
  const blocked = assertSameOriginMutation(req) ?? builderRateLimit(req);
  if (blocked) return blocked;
  if (req.headers.get("content-type")?.split(";")[0] !== "application/json") return json({ error: "JSON required." }, 415);
  const access = await lab(ctx);
  if ("error" in access) return access.error;
  const { db, id } = access;
  const parsed = action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Check the quantities, prices and yield, then try again." }, 400);
  const op = parsed.data;
  if (op.type === "ingredient") {
    const { id: ingredientId, name, currency, costMinorPerKg } = op.ingredient;
    const patch = { name, cost_minor_per_kg: costMinorPerKg, updated_at: new Date().toISOString() };
    const result = ingredientId
      ? await db.from("business_recipe_ingredients").update(patch).eq("business_id", id).eq("id", ingredientId).eq("currency", currency).select("id").maybeSingle()
      : await db.from("business_recipe_ingredients").insert({ ...patch, business_id: id, currency }).select("id").single();
    if (result.error?.code === "23505") return json({ error: "That ingredient already exists in this currency. Update its price instead." }, 409);
    if (result.error || !result.data) return json({ error: "Could not save ingredient." }, 409);
    return json({ ok: true });
  }
  if (op.type === "receipt") {
    const r = await db.rpc("recipe_receive_lot", {p_business:id,p_ingredient:op.ingredient,p_supplier:op.supplier,p_invoice:op.invoice,p_line:op.line,p_code:op.lot,p_grams:op.grams,p_cost:op.cost});
    if (r.error?.code === "23505") return json({error:"This supplier invoice line is already recorded."},409);
    return r.error ? json({error:"Could not record the invoice lot. Check the ingredient and amounts."},409) : json({id:r.data},201);
  }
  if (op.type === "batch") {
    const r = await db.rpc("recipe_record_batch", {p_business:id,p_id:op.batchId,p_formula:op.formulaId,p_label:op.label,p_allocations:op.lots});
    if (r.error?.code === "23505") return json({error:"This batch request was already recorded. Reload the batch history."},409);
    return r.error ? json({error:"Batch not recorded. Check that the selected lots have enough stock and match the saved recipe quantities."},409) : json({id:r.data},201);
  }
  const f = op.formula;
  const ingredients = await db.from("business_recipe_ingredients").select("id,name,currency,cost_minor_per_kg")
    .eq("business_id", id).in("id", f.lines.map(line => line.ingredientId));
  if (ingredients.error) return json({ error: "Could not verify ingredient prices." }, 503);
  if (!calculateRecipe(f, ingredients.data as RecipeIngredient[])) return json({ error: "Choose unique ingredients from this business in the recipe currency." }, 400);
  const result = await db.from("business_recipe_formulas").insert({ business_id: id, name: f.name, configuration: f }).select("id").single();
  return result.error ? json({ error: "Could not save recipe version." }, 503) : json({ id: result.data.id }, 201);
}
