"use client";
import { useCallback, useEffect, useState } from "react";
import { calculateRecipe, formulaSchema, scaleRecipeLines, type RecipeFormula, type RecipeIngredient } from "@/lib/business/recipe-lab";

import { ActualBatches, type Lot, type Batch } from "./actual-batches";

type Currency = "USD" | "XOF";
type LabData = { lots:Lot[]; batches:Batch[]; ingredients: RecipeIngredient[]; formulas: { id: string; createdAt: string; formula: RecipeFormula }[] };
const fresh: RecipeFormula = { name: "", currency: "USD", lines: [], yieldBasisPoints: 9500, servingGrams: 85, packageMinor: 0, priceMinor: 0 };
const field = "mt-1 block w-full rounded-md border border-[#d2cbd5] p-2 text-sm";
const card = "space-y-4 rounded-xl border border-[#ded7df] bg-white p-4 sm:p-6";
const button = "rounded-md bg-[#16142b] px-3 py-2 text-sm font-medium text-white disabled:opacity-50";
const convert = (n: number, c: Currency) => n / (c === "USD" ? 100 : 1);
const format = (n: number, c: Currency) => new Intl.NumberFormat("en", { style: "currency", currency: c }).format(convert(n, c));
const toMinor = (n: string, c: Currency) => Math.round(Number(n) * (c === "USD" ? 100 : 1));

export function RecipeLab({ id }: { id: string }) {
  const endpoint = `/api/businesses/${id}/recipe-lab`;
  const [data, setData] = useState<LabData | null>(null);
  const [ingredient, setIngredient] = useState({ id: undefined as string | undefined, name: "", currency: "USD" as Currency, cost: "" });
  const [formula, setFormula] = useState(fresh);
  const [nextIngredient, setNextIngredient] = useState("");
  const [targetKg, setTargetKg] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch(endpoint, { cache: "no-store", signal });
    if (res.status === 401) setLogin(true);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    if (!signal?.aborted) setData(body);
  }, [endpoint]);
  useEffect(() => {
    const abort = new AbortController();
    void load(abort.signal).catch(e => { if (!abort.signal.aborted) setNote(e.message || "Could not load Recipe Lab."); });
    return () => abort.abort();
  }, [load]);
  async function save(body: object, success: string) {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      setNote(success);
      try { await load(); } catch { setNote(`${success} Reload to see updated records.`); }
    } catch (err) { setNote(err instanceof Error ? err.message : "Could not save the record."); }
    finally { setBusy(false); }
  }

  if (!data) return <div className={card}>
    <p role="status">{note || "Loading your private Recipe Lab…"}</p>
    {login && <a className="underline" href={`/login?next=${encodeURIComponent(`/business/${id}/recipe-lab`)}`}>Sign in</a>}
  </div>;

  const options = data.ingredients.filter(i => i.currency === formula.currency && !formula.lines.some(line => line.ingredientId === i.id));
  const parsed = formulaSchema.safeParse(formula);
  const cost = parsed.success ? calculateRecipe(parsed.data, data.ingredients) : null;
  const moneyInputs = [
    ["packageMinor", "Packaging per serving"],
    ["priceMinor", "Selling price per serving"],
  ] as const;
  return <div className="space-y-6">
    {note && <p role="status" className="rounded-lg bg-[#f2edf4] p-3 text-sm">{note}</p>}
    <section className={card}>
      <div><h2 className="text-xl font-semibold">Ingredient prices</h2><p className="text-sm">Enter your current supplier cost per kilogram. Updating a price recalculates affected recipes.</p></div>
      <form className="grid items-end gap-3 sm:grid-cols-4" onSubmit={e => {
        e.preventDefault();
        void save({ type: "ingredient", ingredient: { id: ingredient.id, name: ingredient.name, currency: ingredient.currency, costMinorPerKg: toMinor(ingredient.cost, ingredient.currency) } }, "Ingredient price saved.");
      }}>
        <label>Ingredient<input className={field} required maxLength={120} value={ingredient.name} onChange={e => setIngredient({ ...ingredient, name: e.target.value })} /></label>
        <label>Currency<select className={field} disabled={Boolean(ingredient.id)} value={ingredient.currency} onChange={e => setIngredient({ ...ingredient, currency: e.target.value as Currency })}><option>USD</option><option>XOF</option></select></label>
        <label>Cost / kg<input className={field} type="number" min="0" required step={ingredient.currency === "USD" ? "0.01" : "1"} value={ingredient.cost} onChange={e => setIngredient({ ...ingredient, cost: e.target.value })} /></label>
        <button className={button} disabled={busy}>{ingredient.id ? "Update price" : "Add ingredient"}</button>
      </form>
      {ingredient.id && <button className="text-sm underline" onClick={() => setIngredient({ name: "", currency: ingredient.currency, cost: "", id: undefined })}>Add another ingredient</button>}
      <ul className="grid gap-2 sm:grid-cols-2">{data.ingredients.map(i => <li className="flex justify-between gap-2 rounded-lg border p-2 text-sm" key={i.id}>
        <span>{i.name} · {format(i.cost_minor_per_kg, i.currency)}/kg</span>
        <button className="underline" onClick={() => setIngredient({ id: i.id, name: i.name, currency: i.currency, cost: String(convert(i.cost_minor_per_kg, i.currency)) })}>Edit</button>
      </li>)}</ul>
    </section>

    <section className={card}>
      <h2 className="text-xl font-semibold">Formulation</h2>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (cost) void save({ type: "formula", formula }, "Recipe version saved."); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>Recipe or version name<input className={field} required maxLength={120} value={formula.name} onChange={e => setFormula({ ...formula, name: e.target.value })} placeholder="Example: Original Vanilla V1.0" /></label>
          <label>Recipe currency<select className={field} value={formula.currency} onChange={e => { setNextIngredient(""); setFormula({ ...formula, currency: e.target.value as Currency, lines: [], packageMinor: 0, priceMinor: 0 }); }}><option>USD</option><option>XOF</option></select></label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label>Add ingredient<select className={field} value={nextIngredient} onChange={e => setNextIngredient(e.target.value)}>
            <option value="">Select an ingredient</option>{options.map(i => <option value={i.id} key={i.id}>{i.name}</option>)}
          </select></label>
          <button type="button" className="rounded border px-3 py-2 text-sm" disabled={!options.some(i => i.id === nextIngredient) || formula.lines.length >= 50}
            onClick={() => { setFormula({ ...formula, lines: [...formula.lines, { ingredientId: nextIngredient, grams: 1000 }] }); setNextIngredient(""); }}>Add to recipe</button>
        </div>
        <ul className="space-y-2">{formula.lines.map((line, index) => <li key={line.ingredientId} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">{data.ingredients.find(i => i.id === line.ingredientId)?.name ?? "Unavailable ingredient"} · grams<input className={field} required type="number" min="1" max="1000000" value={line.grams}
            onChange={e => setFormula({ ...formula, lines: formula.lines.map((value, j) => j === index ? { ...value, grams: Number(e.target.value) } : value) })} /></label>
          <button type="button" className="p-2 text-sm underline" onClick={() => setFormula({ ...formula, lines: formula.lines.filter((_, j) => j !== index) })}>Remove</button>
        </li>)}</ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>Usable yield (%)<input className={field} type="number" step="0.01" min="0.01" max="100" required value={formula.yieldBasisPoints / 100} onChange={e => setFormula({ ...formula, yieldBasisPoints: Math.round(Number(e.target.value) * 100) })} /></label>
          <label>Serving size (grams)<input className={field} required type="number" min="1" value={formula.servingGrams} onChange={e => setFormula({ ...formula, servingGrams: Number(e.target.value) })} /></label>
          {moneyInputs.map(([key, label]) => <label key={key}>{label} ({formula.currency})<input className={field} type="number" min="0" step={formula.currency === "USD" ? "0.01" : "1"} value={convert(formula[key], formula.currency)} onChange={e => setFormula({ ...formula, [key]: toMinor(e.target.value, formula.currency) })} /></label>)}
        </div>
        {formula.lines.length > 0 && <div className="flex flex-wrap items-end gap-3">
          <label>Scale to batch size (kg)<input className={field} type="number" min="0.001" step="0.001" value={targetKg}
            onChange={e => setTargetKg(e.target.value)} /></label>
          <button type="button" className="rounded border px-3 py-2 text-sm" disabled={!targetKg} onClick={() => {
            const lines = scaleRecipeLines(formula.lines, Math.round(Number(targetKg) * 1000));
            if (!lines) { setNote("Choose a batch size that keeps every ingredient between 1 g and 1,000 kg."); return; }
            setFormula({ ...formula, lines });
            setNote("Batch scaled. Save a new version if you want to keep it.");
          }}>Scale batch</button>
        </div>}
        {cost && <dl className="grid gap-3 rounded-lg bg-[#faf8f5] p-4 sm:grid-cols-2">
          {[
            ["Batch size", `${(cost.batchGrams / 1000).toFixed(3)} kg`],
            ["Ingredient cost per batch", format(cost.batchMinor, formula.currency)],
            ["Saleable servings", String(cost.servings)],
            ["Ingredients + packaging per serving", cost.portionMinor === null ? "Yield below one serving" : format(cost.portionMinor, formula.currency)],
            ["Ingredient + packaging share", cost.costPercent === null ? "Add a selling price" : `${cost.costPercent.toFixed(1)}%`],
            ["Contribution before labor and overhead", cost.contributionMinor === null ? "—" : format(cost.contributionMinor, formula.currency)],
          ].map(([label, value]) => <div key={label}><dt className="text-xs">{label}</dt><dd className="text-lg font-semibold">{value}</dd></div>)}
        </dl>}
        <button className={button} disabled={busy || !cost}>Save recipe version</button>
      </form>
    </section>
    <ActualBatches lots={data.lots} batches={data.batches} ingredients={data.ingredients} formulas={data.formulas} save={save} busy={busy} />
    <section className={card}>
      <h2 className="text-xl font-semibold">Saved versions</h2>
      <p className="text-sm">Reopen a formulation to see costs at today’s ingredient prices. Saving creates a new version.</p>
      {!data.formulas.length && <p className="text-sm">No recipes saved yet.</p>}
      <ul className="space-y-2">{data.formulas.map(record => <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm">
        <span>{record.formula.name} · {new Date(record.createdAt).toLocaleString()}</span>
        <button className="underline" onClick={() => { setNextIngredient(""); setFormula(record.formula); setNote(`Opened ${record.formula.name}.`); }}>Open this version</button>
      </li>)}</ul>
    </section>
  </div>;
}
