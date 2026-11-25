create table public.business_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  currency text not null check (currency in ('USD','XOF')),
  cost_minor_per_kg integer not null check (cost_minor_per_kg between 0 and 100000000),
  updated_at timestamptz not null default now()
);
create unique index business_recipe_ingredient_name_unique on public.business_recipe_ingredients(business_id,currency,lower(name));
create table public.business_recipe_formulas (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  configuration jsonb not null check (jsonb_typeof(configuration)='object' and pg_column_size(configuration)<=16000),
  created_at timestamptz not null default now()
);
create index business_recipe_formulas_history on public.business_recipe_formulas(business_id,created_at desc);
alter table public.business_recipe_ingredients enable row level security;
alter table public.business_recipe_formulas enable row level security;
revoke all on public.business_recipe_ingredients,public.business_recipe_formulas from public,anon,authenticated;
grant select,insert,update on public.business_recipe_ingredients to authenticated;
grant select,insert on public.business_recipe_formulas to authenticated;

-- Ordinary company employees do not have access to manufacturing formulas.
create policy recipe_lab_ingredient_founders on public.business_recipe_ingredients for all to authenticated
  using (exists (select 1 from public.business_members m where m.business_id=business_recipe_ingredients.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('founder','cofounder')))
  with check (exists (select 1 from public.business_members m where m.business_id=business_recipe_ingredients.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('founder','cofounder')));
create policy recipe_lab_formula_founders on public.business_recipe_formulas for all to authenticated
  using (exists (select 1 from public.business_members m where m.business_id=business_recipe_formulas.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('founder','cofounder')))
  with check (exists (select 1 from public.business_members m where m.business_id=business_recipe_formulas.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('founder','cofounder')));
