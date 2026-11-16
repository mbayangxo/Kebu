-- Parent-room locking covers first join and last leave. Never delete duplicate history.
create unique index if not exists room_calls_one_active_per_room on public.room_calls(room_id) where ended_at is null;
-- Let the call's starter pick a cap within the existing 2-8 range, instead
-- of every call silently defaulting to the ceiling with no way to choose
-- smaller. The default itself stays 8 (an explicit product decision, not an
-- oversight - see lib/rooms/call-mesh.ts's DEFAULT_MESH_PARTICIPANTS comment
-- for the mobile-bandwidth tradeoff that was weighed and kept): whoever
-- wants a smaller, more reliable call on a weak connection can now ask for
-- one via the size picker, without changing what happens when nobody asks.
create or replace function public.room_call_join(p_room uuid, p_max_participants int default 8)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  call_row public.room_calls%rowtype;
  active_count int;
  requested_cap int;
  is_new_call boolean;
begin
  if actor is null then return null; end if;
  perform 1 from public.rooms where id=p_room for update;
  if not found or not public.can_access_room(p_room) then return null; end if;

  select * into call_row from public.room_calls
    where room_id = p_room and ended_at is null
    order by started_at desc limit 1 for update;
  is_new_call := not found;

  if is_new_call then
    -- Clamp rather than reject: a caller-supplied value outside the table's
    -- own check constraint just gets pulled back into range instead of
    -- failing the whole join, since the UI already only offers in-range
    -- choices and this is a floor/ceiling, not a validation surface.
    requested_cap := least(greatest(coalesce(p_max_participants, 8), 2), 8);
    insert into public.room_calls(room_id, started_by, max_participants)
      values (p_room, actor, requested_cap)
      returning * into call_row;
  end if;

  select count(*) into active_count from public.room_call_participants
    where call_id = call_row.id and left_at is null and user_id <> actor;
  if active_count >= call_row.max_participants then
    raise exception 'Call is full';
  end if;

  insert into public.room_call_participants(call_id, user_id)
    values (call_row.id, actor)
    on conflict (call_id, user_id) do update
      set joined_at = case when public.room_call_participants.left_at is not null then now()
                           else public.room_call_participants.joined_at end,
          left_at = null;

  return jsonb_build_object(
    'id', call_row.id, 'roomId', call_row.room_id, 'startedAt', call_row.started_at,
    'maxParticipants', call_row.max_participants, 'created', is_new_call
  );
end;
$$;
revoke all on function public.room_call_join(uuid, int) from public, anon;
grant execute on function public.room_call_join(uuid, int) to authenticated;

create or replace function public.room_call_leave(p_call uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  remaining int;
  call_room uuid;
begin
  if actor is null then return null; end if;
  select room_id into call_room from public.room_calls where id = p_call;
  if call_room is null then return null; end if;
  perform 1 from public.rooms where id=call_room for update;
  if not public.can_access_room(call_room) then return null; end if;
  perform 1 from public.room_calls where id=p_call for update;

  update public.room_call_participants set left_at = now()
    where call_id = p_call and user_id = actor and left_at is null;

  select count(*) into remaining from public.room_call_participants
    where call_id = p_call and left_at is null;
  if remaining = 0 then
    update public.room_calls set ended_at = coalesce(ended_at, now()) where id = p_call;
  end if;
  return jsonb_build_object('left', true, 'ended', remaining = 0);
end;
$$;
revoke all on function public.room_call_leave(uuid) from public, anon;
grant execute on function public.room_call_leave(uuid) to authenticated;
