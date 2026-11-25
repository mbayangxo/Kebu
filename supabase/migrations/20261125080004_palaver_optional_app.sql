alter table public.kebu_builtin_app_installs
  drop constraint if exists kebu_builtin_app_installs_app_key_check;
alter table public.kebu_builtin_app_installs
  add constraint kebu_builtin_app_installs_app_key_check
  check(app_key in ('live-rooms','friends','liguey','palaver'));
