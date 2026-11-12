-- Only current room members with an active call participation can exchange signals.
create policy "Active call participants receive signals" on realtime.messages for select to authenticated using (
  exists (select 1 from public.room_calls c join public.room_call_participants p on p.call_id = c.id
    where (select realtime.topic()) = 'room-call:' || c.id::text
      and c.ended_at is null and p.user_id = (select auth.uid()) and p.left_at is null)
);
create policy "Active call participants send signals" on realtime.messages for insert to authenticated with check (
  exists (select 1 from public.room_calls c join public.room_call_participants p on p.call_id = c.id
    where (select realtime.topic()) = 'room-call:' || c.id::text
      and c.ended_at is null and p.user_id = (select auth.uid()) and p.left_at is null)
);
