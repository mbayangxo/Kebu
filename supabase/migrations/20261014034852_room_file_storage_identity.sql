-- A room member must not attach metadata pointing at someone else's private object.
-- Uploads already use this uploader/room prefix; enforce it for direct Data API inserts too.
drop policy if exists "Members create room files" on public.room_files;
create policy "Members create room files" on public.room_files
for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and public.can_access_room(room_id)
  and storage_path like (uploaded_by::text || '/rooms/' || room_id::text || '/%')
);
