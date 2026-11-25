import { z } from "zod";

export const ingredientCurrency = z.enum(["USD", "XOF"]);
export const recipeIngredientSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(120),
  currency: ingredientCurrency,
  costMinorPerKg: z.number().int().min(0).max(100_000_000),
});
export const formulaSchema = z.object({
  name: z.string().trim().min(1).max(120),
  currency: ingredientCurrency,
  lines: z.array(z.object({ ingredientId: z.uuid(), grams: z.number().int().positive().max(1_000_000) })).min(1).max(50),
  yieldBasisPoints: z.number().int().min(1).max(10_000),
  servingGrams: z.number().int().positive().max(100_000),
  packageMinor: z.number().int().min(0).max(100_000_000),
  priceMinor: z.number().int().min(0).max(100_000_000),
});

export type RecipeIngredient = {
  id: string; name: string; currency: z.infer<typeof ingredientCurrency>; cost_minor_per_kg: number;
};
export type RecipeFormula = z.infer<typeof formulaSchema>;

export function calculateRecipe(formula: RecipeFormula, ingredients: readonly RecipeIngredient[]) {
  const prices = new Map(ingredients.filter(i => i.currency === formula.currency).map(i => [i.id, i.cost_minor_per_kg]));
  const seen = new Set<string>();
  let batchGrams = 0;
  let ingredientMilliMinor = 0;
  for (const line of formula.lines) {
    const cost = prices.get(line.ingredientId);
    if (cost === undefined || seen.has(line.ingredientId)) return null;
    seen.add(line.ingredientId);
    batchGrams += line.grams;
    ingredientMilliMinor += cost * line.grams; // 1/1000 of a minor currency unit
  }
  const usableGrams = Math.floor(batchGrams * formula.yieldBasisPoints / 10_000);
  const servings = Math.floor(usableGrams / formula.servingGrams);
  const batchMinor = ingredientMilliMinor / 1000;
  const portionMinor = servings ? batchMinor / servings + formula.packageMinor : null;
  return {
    batchGrams, usableGrams, servings, batchMinor, portionMinor,
    costPercent: portionMinor !== null && formula.priceMinor > 0 ? portionMinor / formula.priceMinor * 100 : null,
    contributionMinor: portionMinor !== null && formula.priceMinor > 0 ? formula.priceMinor - portionMinor : null,
  };
}

/** Preserve proportions to the nearest gram and keep the exact target weight. */
export function scaleRecipeLines(lines: RecipeFormula["lines"], targetGrams: number): RecipeFormula["lines"] | null {
  const total = lines.reduce((sum, line) => sum + line.grams, 0);
  if (!Number.isSafeInteger(targetGrams) || targetGrams < lines.length || targetGrams > 50_000_000 || total <= 0) return null;
  const scaled = lines.map((line, index) => {
    const numerator = targetGrams * line.grams;
    return { index, grams: Math.floor(numerator / total), remainder: numerator % total };
  });
  const missing = targetGrams - scaled.reduce((sum, line) => sum + line.grams, 0);
  const ranked = [...scaled].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < missing; index++) ranked[index]!.grams++;
  if (scaled.some(line => line.grams < 1 || line.grams > 1_000_000)) return null;
  return lines.map((line, index) => ({ ...line, grams: scaled[index]!.grams }));
}
