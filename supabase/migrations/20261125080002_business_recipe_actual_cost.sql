create table public.business_recipe_lots (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 ingredient_id uuid not null references public.business_recipe_ingredients(id),
 supplier text not null, invoice text not null, line_number integer not null,
 lot_code text not null, currency text not null check (currency in ('USD','XOF')),
 received_grams integer not null check (received_grams between 1 and 50000000),
 remaining_grams integer not null check (remaining_grams between 0 and received_grams),
 invoice_cost_minor bigint not null check (invoice_cost_minor between 0 and 100000000000),
 received_at timestamptz not null default now(),
 unique (business_id,supplier,invoice,line_number)
);
create table public.business_recipe_batches (
 id uuid primary key,
 business_id uuid not null references public.businesses(id) on delete cascade,
 formula_id uuid not null references public.business_recipe_formulas(id),
 batch_label text not null, currency text not null,
 actual_ingredient_minor numeric(20,4) not null,
 allocations jsonb not null,
 recorded_at timestamptz not null default now()
);
alter table public.business_recipe_lots enable row level security;
alter table public.business_recipe_batches enable row level security;
revoke all on public.business_recipe_lots,public.business_recipe_batches from public,anon,authenticated;
grant select on public.business_recipe_lots,public.business_recipe_batches to authenticated;
create policy recipe_lots_founders on public.business_recipe_lots for select to authenticated using (
 exists(select 1 from public.business_members m where m.business_id=business_recipe_lots.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('founder','cofounder')));
create policy recipe_batches_founders on public.business_recipe_batches for select to authenticated using (
 exists(select 1 from public.business_members m where m.business_id=business_recipe_batches.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('founder','cofounder')));

create function public.recipe_receive_lot(p_business uuid,p_ingredient uuid,p_supplier text,p_invoice text,p_line integer,p_code text,p_grams integer,p_cost bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_result uuid;
begin
 if not exists(select 1 from public.business_members m where m.business_id=p_business and m.user_id=auth.uid() and m.status='active' and m.role in ('founder','cofounder')) then raise exception 'Not authorized' using errcode='42501'; end if;
 if coalesce(length(trim(p_supplier)),0) not between 1 and 120 or coalesce(length(trim(p_invoice)),0) not between 1 and 120 or coalesce(length(trim(p_code)),0) not between 1 and 120 or p_line is null or p_line<1 then raise exception 'Invalid invoice line'; end if;
 insert into public.business_recipe_lots(business_id,ingredient_id,supplier,invoice,line_number,lot_code,currency,received_grams,remaining_grams,invoice_cost_minor)
 select p_business,i.id,lower(trim(p_supplier)),trim(p_invoice),p_line,trim(p_code),i.currency,p_grams,p_grams,p_cost
 from public.business_recipe_ingredients i where i.id=p_ingredient and i.business_id=p_business returning id into v_result;
 if not found then raise exception 'Ingredient unavailable'; end if;
 return v_result;
end; $$;

create function public.recipe_record_batch(p_business uuid,p_id uuid,p_formula uuid,p_label text,p_allocations jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare f jsonb; entry record; lot public.business_recipe_lots%rowtype; details jsonb := '[]'; total numeric := 0; cost numeric;
begin
 if not exists(select 1 from public.business_members m where m.business_id=p_business and m.user_id=auth.uid() and m.status='active' and m.role in ('founder','cofounder')) then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_id is null or coalesce(length(trim(p_label)),0) not between 1 and 120 or p_allocations is null or jsonb_typeof(p_allocations)<>'array' or jsonb_array_length(p_allocations) not between 1 and 100 then raise exception 'Invalid batch'; end if;
 select configuration into f from public.business_recipe_formulas where id=p_formula and business_id=p_business;
 if not found or f->>'currency' not in ('USD','XOF') or coalesce(jsonb_array_length(f->'lines'),0)=0 then raise exception 'Recipe unavailable'; end if;
 -- Insert first: concurrent retries cannot consume inventory twice.
 insert into public.business_recipe_batches(id,business_id,formula_id,batch_label,currency,actual_ingredient_minor,allocations)
 values(p_id,p_business,p_formula,trim(p_label),f->>'currency',0,'[]');
 for entry in select * from jsonb_to_recordset(p_allocations) as a(lot_id uuid,grams integer) order by lot_id loop
   if entry.grams is null or entry.grams<1 then raise exception 'Invalid lot quantity'; end if;
   select * into lot from public.business_recipe_lots where id=entry.lot_id and business_id=p_business for update;
   if not found or lot.currency<>f->>'currency' or lot.remaining_grams<entry.grams then raise exception 'Lot unavailable or insufficient'; end if;
   cost := round(lot.invoice_cost_minor::numeric*entry.grams/lot.received_grams,4);
   total := total + cost;
   update public.business_recipe_lots set remaining_grams=remaining_grams-entry.grams where id=lot.id;
   details := details || jsonb_build_array(jsonb_build_object('lot_id',lot.id,'ingredient_id',lot.ingredient_id,'lot_code',lot.lot_code,'invoice',lot.invoice,'grams',entry.grams,'cost_minor',cost));
 end loop;
 if exists(
   with planned as (select (x->>'ingredientId')::uuid id,sum((x->>'grams')::integer) grams from jsonb_array_elements(f->'lines') x group by 1),
        used as (select (x->>'ingredient_id')::uuid id,sum((x->>'grams')::integer) grams from jsonb_array_elements(details) x group by 1)
   select 1 from planned full join used using(id) where planned.grams is distinct from used.grams
 ) then raise exception 'Lot quantities must match the saved formulation'; end if;
 update public.business_recipe_batches set actual_ingredient_minor=total,allocations=details where id=p_id;
 return p_id;
end; $$;
revoke all on function public.recipe_receive_lot(uuid,uuid,text,text,integer,text,integer,bigint),public.recipe_record_batch(uuid,uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.recipe_receive_lot(uuid,uuid,text,text,integer,text,integer,bigint),public.recipe_record_batch(uuid,uuid,uuid,text,jsonb) to authenticated;
