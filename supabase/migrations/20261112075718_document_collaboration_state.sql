alter table public.workspace_items add column if not exists collab_state text
  check (collab_state is null or octet_length(collab_state) <= 2000000);

alter table public.workspace_items add column if not exists collab_epoch uuid;
alter table public.workspace_items add column if not exists collab_write_id uuid;

-- Private Realtime channels: database permissions, never a UI-only join gate.
-- realtime.messages already has RLS enabled by Supabase; do not alter its ownership settings.
create policy "Document collaborators receive" on realtime.messages for select to authenticated using (
  exists (select 1 from public.workspace_items w where w.kind = 'doc'
    and (select realtime.topic()) in ('doc-collab:' || w.id::text || ':' || w.collab_epoch::text, 'doc-presence:' || w.id::text || ':' || w.collab_epoch::text))
);
create policy "Document collaborators send" on realtime.messages for insert to authenticated with check (
  exists (select 1 from public.workspace_items w where w.kind = 'doc'
    and (select realtime.topic()) in ('doc-collab:' || w.id::text || ':' || w.collab_epoch::text, 'doc-presence:' || w.id::text || ':' || w.collab_epoch::text))
);
notify pgrst, 'reload schema';

-- Older clients or direct Data API writes must invalidate the old CRDT history.
create or replace function public.invalidate_stale_document_collaboration()
returns trigger language plpgsql set search_path = public as $$
begin
  if (new.rich_content is distinct from old.rich_content or new.body is distinct from old.body)
     and new.collab_write_id is not distinct from old.collab_write_id then
    new.collab_state := null;
    new.collab_epoch := null;
    new.collab_write_id := null;
  end if;
  return new;
end;
$$;
revoke all on function public.invalidate_stale_document_collaboration() from public;
create trigger workspace_items_invalidate_collab before update on public.workspace_items
for each row execute function public.invalidate_stale_document_collaboration();
