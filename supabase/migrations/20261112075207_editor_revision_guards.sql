-- Strictly advance body revision even for multiple writes in one transaction.
create or replace function public.advance_library_body_revision()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
revoke all on function public.advance_library_body_revision() from public;
drop trigger if exists sheet_bodies_set_updated_at on public.sheet_bodies;
create trigger sheet_bodies_set_updated_at before update on public.sheet_bodies
for each row execute function public.advance_library_body_revision();
drop trigger if exists slide_bodies_set_updated_at on public.slide_bodies;
create trigger slide_bodies_set_updated_at before update on public.slide_bodies
for each row execute function public.advance_library_body_revision();
