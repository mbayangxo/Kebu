alter table public.user_profiles
  add column if not exists kebu_setup jsonb not null default
  '{"intents":["explore"],"tools":["search","opportunities","spaces"],"persona":"personal","workspaceName":"","onboardingComplete":false,"version":"v2"}'::jsonb;

alter table public.user_profiles
  drop constraint if exists user_profiles_kebu_setup_object;

alter table public.user_profiles
  add constraint user_profiles_kebu_setup_object
  check (jsonb_typeof(kebu_setup) = 'object');
