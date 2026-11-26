-- Upgrade private room calls from a two-person, RPC-polling-signaled prototype
-- to real group meetings. SDP offers/answers/ICE candidates now travel over
-- Supabase Realtime broadcast (ephemeral, peer-to-peer) instead of being
-- stored and polled in Postgres; this table only tracks call sessions and
-- participants for authorization, capacity, and history.
drop function if exists public.room_call_exchange(uuid, text, uuid, uuid, text);
drop table if exists public.room_calls cascade;

create table public.room_calls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  started_by uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Kept in sync with MAX_MESH_PARTICIPANTS in lib/rooms/call-mesh.ts — a full
  -- mesh (one RTCPeerConnection per pair) does not scale past a small group
  -- without a media server (SFU), which is out of scope for this slice.
  max_participants int not null default 8 check (max_participants between 2 and 8)
);
alter table public.room_calls enable row level security;
revoke all on public.room_calls from public, anon, authenticated;
grant select on public.room_calls to authenticated;
create index room_calls_room_idx on public.room_calls(room_id, started_at desc);

create table public.room_call_participants (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.room_calls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (call_id, user_id)
);
alter table public.room_call_participants enable row level security;
revoke all on public.room_call_participants from public, anon, authenticated;
grant select on public.room_call_participants to authenticated;
create index room_call_participants_call_idx on public.room_call_participants(call_id, left_at);
create index room_call_participants_user_idx on public.room_call_participants(user_id, joined_at desc);

create policy "Room members read calls" on public.room_calls
  for select using (public.can_access_room(room_id));

create policy "Room members read call participants" on public.room_call_participants
  for select using (
    exists (
      select 1 from public.room_calls c
      where c.id = room_call_participants.call_id and public.can_access_room(c.room_id)
    )
  );

-- Get-or-create the room's active call and join it. Locks the active call row
-- so two simultaneous joins can't both squeeze past the capacity check.
create or replace function public.room_call_join(p_room uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  call_row public.room_calls%rowtype;
  active_count int;
begin
  if actor is null or not public.can_access_room(p_room) then return null; end if;

  select * into call_row from public.room_calls
    where room_id = p_room and ended_at is null
    order by started_at desc limit 1 for update;

  if not found then
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
    'maxParticipants', call_row.max_participants
  );
end;
$$;
revoke all on function public.room_call_join(uuid) from public, anon;
grant execute on function public.room_call_join(uuid) to authenticated;

-- Leave a call. Ends it for everyone once the last active participant leaves.
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
  if call_room is null or not public.can_access_room(call_room) then return null; end if;

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

-- Force-end a call for everyone. Only the call's starter or a room owner/admin.
create or replace function public.room_call_end(p_call uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  call_row public.room_calls%rowtype;
  allowed boolean;
begin
  if actor is null then return null; end if;
  select * into call_row from public.room_calls where id = p_call for update;
  if not found then return null; end if;

  select (
    call_row.started_by = actor
    or exists (
      select 1 from public.rooms r where r.id = call_row.room_id and r.created_by = actor
    )
    or exists (
      select 1 from public.room_members m
      where m.room_id = call_row.room_id and m.user_id = actor and m.role in ('owner','admin')
    )
  ) into allowed;
  if not allowed then return null; end if;

  update public.room_calls set ended_at = coalesce(ended_at, now()) where id = p_call;
  update public.room_call_participants set left_at = coalesce(left_at, now()) where call_id = p_call;
  return jsonb_build_object('ended', true);
end;
$$;
revoke all on function public.room_call_end(uuid) from public, anon;
grant execute on function public.room_call_end(uuid) to authenticated;
