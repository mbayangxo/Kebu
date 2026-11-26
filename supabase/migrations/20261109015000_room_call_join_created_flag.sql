-- room_call_join previously gave callers no way to tell "I just started a new
-- call" apart from "I joined one already in progress" — needed so the API
-- layer can notify other room members only when a call is genuinely new, not
-- on every join/rejoin.
create or replace function public.room_call_join(p_room uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  call_row public.room_calls%rowtype;
  active_count int;
  is_new_call boolean;
begin
  if actor is null or not public.can_access_room(p_room) then return null; end if;

  select * into call_row from public.room_calls
    where room_id = p_room and ended_at is null
    order by started_at desc limit 1 for update;
  is_new_call := not found;

  if is_new_call then
    insert into public.room_calls(room_id, started_by) values (p_room, actor)
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
revoke all on function public.room_call_join(uuid) from public, anon;
grant execute on function public.room_call_join(uuid) to authenticated;
