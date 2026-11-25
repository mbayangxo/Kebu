"use client";
import { useState, type FormEvent } from "react";
import type { RecipeFormula, RecipeIngredient } from "@/lib/business/recipe-lab";

export type Lot = { id:string; ingredient_id:string; supplier:string; invoice:string; lot_code:string; currency:string; remaining_grams:number };
export type Batch = { id:string; batch_label:string; currency:string; actual_ingredient_minor:number; allocations:{lot_id:string;lot_code:string;invoice:string;grams:number}[] };
export function ActualBatches({lots,batches,ingredients,formulas,save,busy}: {
 lots:Lot[]; batches:Batch[]; ingredients:RecipeIngredient[]; formulas:{id:string;formula:RecipeFormula}[];
 save:(body:object, message:string)=>Promise<void>; busy:boolean;
}) {
 const [ingredient,setIngredient]=useState("");
 const [formulaId,setFormula]=useState("");
 const [batchId,setBatchId]=useState("");
 const [allocations,setAllocations]=useState<{lot_id:string;grams:number}[]>([]);
 const currency=ingredients.find(i=>i.id===ingredient)?.currency;
 const formula=formulas.find(f=>f.id===formulaId)?.formula;
 const formClass="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 [&_input]:block [&_input]:w-full [&_input]:rounded [&_input]:border [&_input]:p-2 [&_select]:block [&_select]:w-full [&_select]:rounded [&_select]:border [&_select]:p-2";
 function receive(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form=new FormData(e.currentTarget), str=(key:string)=>String(form.get(key)??"");
  void save({type:"receipt",ingredient,supplier:str("supplier"),invoice:str("invoice"),line:Number(str("line")),lot:str("lot"),grams:Number(str("grams")),cost:Math.round(Number(str("cost"))*(currency==="USD"?100:1))},"Invoice line and inventory lot recorded.");
 }
 return <section className="space-y-4 rounded-xl border bg-white p-5">
  <h2 className="text-xl font-semibold">Invoice lots and actual batch cost</h2>
  <p className="text-sm">Enter each invoice line’s net ingredient cost. Recording a batch deducts its lot quantities and locks the ingredient cost. Labor and packaging are separate.</p>
  <form className={formClass} onSubmit={receive}>
   <label>Ingredient<select required value={ingredient} onChange={e=>setIngredient(e.target.value)}><option value="">Choose ingredient</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name} · {i.currency}</option>)}</select></label>
   {(["supplier","invoice","lot"] as const).map(k=><label key={k}>{({supplier:"Supplier",invoice:"Invoice number",lot:"Supplier lot code"})[k]}<input name={k} required maxLength={120}/></label>)}
   <label>Invoice line number<input name="line" required type="number" min="1" max="100000" defaultValue="1"/></label>
   <label>Received grams<input name="grams" required type="number" min="1" max="50000000"/></label>
   <label>Net invoice line cost {currency && `(${currency})`}<input name="cost" required type="number" min="0" step={currency==="USD"?"0.01":"1"}/></label>
   <button disabled={busy||!currency} className="self-end rounded bg-[#16142b] p-2 text-white disabled:opacity-50">Record invoice lot</button>
  </form>
  <form className={formClass} onSubmit={e=>{
   e.preventDefault();
   const label=String(new FormData(e.currentTarget).get("label")??"");
   const id=batchId||crypto.randomUUID();
   setBatchId(id);
   void save({type:"batch",batchId:id,formulaId,label,lots:allocations},"Actual batch cost recorded.");
  }}>
   <label>Saved recipe<select required value={formulaId} onChange={e=>{setFormula(e.target.value);setAllocations([]);setBatchId("");}}><option value="">Choose version</option>{formulas.map(f=><option key={f.id} value={f.id}>{f.formula.name}</option>)}</select></label>
   <label>Batch name<input name="label" required maxLength={120} onChange={()=>setBatchId("")}/></label>
   {formula?.lines.map(line=><fieldset key={line.ingredientId} className="space-y-2 sm:col-span-2"><legend>{ingredients.find(i=>i.id===line.ingredientId)?.name??"Ingredient"} · {line.grams} g required</legend>
   {lots.filter(l=>l.ingredient_id===line.ingredientId&&l.remaining_grams>0&&l.currency===formula.currency).map(l=><label className="block text-sm" key={l.id}>{l.lot_code} · {l.supplier} invoice {l.invoice} · {l.remaining_grams} g available
   <input type="number" min="0" max={l.remaining_grams} aria-label={`Grams from lot ${l.lot_code}`} value={allocations.find(a=>a.lot_id===l.id)?.grams??""} onChange={e=>{const n=Number(e.target.value);setBatchId("");setAllocations(a=>[...a.filter(x=>x.lot_id!==l.id),...(n>0?[{lot_id:l.id,grams:n}]:[])]);}}/></label>)}</fieldset>)}
   <button disabled={busy||!formula||!allocations.length} className="rounded bg-[#16142b] p-2 text-white disabled:opacity-50">Record batch and deduct lots</button>
  </form>
  <h3 className="font-semibold">Recorded batches</h3>
  {batches.length===0?<p className="text-sm">No actual batch costs recorded yet.</p>:<ul className="space-y-2">{batches.map(b=><li className="rounded border p-3" key={b.id}>
   <strong>{b.batch_label}</strong> · {new Intl.NumberFormat("en",{style:"currency",currency:b.currency}).format(Number(b.actual_ingredient_minor)/(b.currency==="USD"?100:1))}
   <p className="text-sm">{b.allocations.map(a=>`${a.lot_code} (${a.invoice}): ${a.grams} g`).join(" · ")}</p>
  </li>)}</ul>}
 </section>;
}
