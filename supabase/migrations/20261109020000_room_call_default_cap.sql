-- Lower the default mesh-call size and let the call's starter pick a cap
-- within the existing 2-8 range, instead of every call silently defaulting
-- to the ceiling. Full mesh means each participant uploads one video stream
-- per *other* participant with no shared/relay path, so going from 4 to 8
-- participants doesn't add capacity gracefully - it roughly doubles each
-- phone's simultaneous upload load. Kebu's users are mobile-first on
-- mid/low-end Android over African mobile networks where uplink is usually
-- the scarce resource, so a small call should stay small by default; a
-- larger one is still available for whoever explicitly asks for it.
create or replace function public.room_call_join(p_room uuid, p_max_participants int default 4)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  call_row public.room_calls%rowtype;
  active_count int;
  requested_cap int;
begin
  if actor is null or not public.can_access_room(p_room) then return null; end if;

  select * into call_row from public.room_calls
    where room_id = p_room and ended_at is null
    order by started_at desc limit 1 for update;

  if not found then
    -- Clamp rather than reject: a caller-supplied value outside the table's
    -- own check constraint just gets pulled back into range instead of
    -- failing the whole join, since the UI already only offers in-range
    -- choices and this is a floor/ceiling, not a validation surface.
    requested_cap := least(greatest(coalesce(p_max_participants, 4), 2), 8);
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
    'maxParticipants', call_row.max_participants
  );
end;
$$;
revoke all on function public.room_call_join(uuid, int) from public, anon;
grant execute on function public.room_call_join(uuid, int) to authenticated;

-- The old single-argument overload from 20261108020000 is gone once Postgres
-- resolves calls against the two-argument version with its default; drop it
-- explicitly so there's exactly one room_call_join to keep in sync with.
drop function if exists public.room_call_join(uuid);

alter table public.room_calls alter column max_participants set default 4;
