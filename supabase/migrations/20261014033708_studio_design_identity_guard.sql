-- Editors may change content, not the identity/ownership or workspace of a design.
-- SECURITY INVOKER preserves caller privileges; this does not bypass RLS.
create schema if not exists private;
create or replace function private.guard_studio_design_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id then
      raise exception 'Design ownership cannot be changed.' using errcode = '42501';
    end if;
    if (new.business_id is distinct from old.business_id or new.folder_id is distinct from old.folder_id)
       and old.owner_id is distinct from auth.uid() then
      raise exception 'Only the owner can move a design.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_studio_design_identity() from public;
drop trigger if exists guard_studio_design_identity on public.create_designs;
create trigger guard_studio_design_identity
before update on public.create_designs
for each row execute function private.guard_studio_design_identity();
