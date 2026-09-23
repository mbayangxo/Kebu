alter table public.project_pages add column if not exists parent_id uuid null references public.project_pages(id) on delete set null;
create index if not exists project_pages_parent_id_idx on public.project_pages(parent_id);
create or replace function public.prevent_project_page_parent_cycle()
returns trigger language plpgsql set search_path = public as $$
declare cursor_id uuid;
begin
  if new.parent_id is null then return new; end if;
  if new.parent_id = new.id then raise exception 'A page cannot be its own parent'; end if;
  if not exists (select 1 from public.project_pages p where p.id = new.parent_id and p.project_id = new.project_id) then
    raise exception 'Parent page must belong to the same project';
  end if;
  cursor_id := new.parent_id;
  while cursor_id is not null loop
    if cursor_id = new.id then raise exception 'Page hierarchy cycle detected'; end if;
    select parent_id into cursor_id from public.project_pages where id = cursor_id;
  end loop;
  return new;
end $$;
drop trigger if exists project_pages_parent_cycle on public.project_pages;
create trigger project_pages_parent_cycle before insert or update of parent_id, project_id on public.project_pages for each row execute function public.prevent_project_page_parent_cycle();
