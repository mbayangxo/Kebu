-- Yande shared gateway — real observability foundation for "one system,
-- not a bot per feature."
--
-- Confirmed before writing anything: Yande AI exists today as at least
-- four independent direct-Anthropic call sites (the site-wide chat
-- assistant at app/api/yande/assist, Builder's lib/create/ai-improve.ts,
-- Studio's lib/studio/ai-generate.ts, and lib/create/experience-model-
-- gateway.ts's one caller), each with its own system prompt, no shared
-- logging, and no consistent identity/safety preamble. This migration
-- does not merge the model-calling code (that lives in
-- lib/yande/gateway.ts, a TypeScript module, not SQL) — it gives every
-- feature that adopts the shared gateway one real place to record what
-- actually happened, which is the honest, buildable first step toward
-- "continuously learns" — not a claim that learning/fine-tuning exists
-- yet. It does not.
--
-- Deliberately NOT an exact action-name CHECK constraint (unlike the
-- already-broken account_ai_usage_events.action check this repository
-- already has elsewhere) — that shape requires a migration every time a
-- new feature adopts the gateway, which is exactly how that earlier
-- table's migration chain broke. `feature` is instead format-checked
-- (lowercase snake_case, bounded length), not value-checked.

create table public.yande_interactions (
  id uuid primary key default gen_random_uuid(),
  feature text not null check (feature ~ '^[a-z][a-z0-9_]{1,63}$'),
  mode text not null check (mode in ('chat', 'structured')),
  user_id uuid references auth.users(id) on delete set null,
  model text not null,
  outcome text not null check (outcome in ('ok', 'error')),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  error_message text,
  created_at timestamptz not null default now()
);

create index yande_interactions_user_idx on public.yande_interactions (user_id, created_at desc) where user_id is not null;
create index yande_interactions_feature_idx on public.yande_interactions (feature, created_at desc);

alter table public.yande_interactions enable row level security;

create policy "Users read their own Yande interactions"
  on public.yande_interactions for select to authenticated
  using (user_id = auth.uid());

revoke all on public.yande_interactions from anon, authenticated;
grant select on public.yande_interactions to authenticated;
grant all on public.yande_interactions to service_role;
