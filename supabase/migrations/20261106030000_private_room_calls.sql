-- Two-person private calls. SDP is available only through the participant-scoped RPC.
create table public.room_calls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  ended_at timestamptz,
  offer text,
  answer text,
  check (host_id <> guest_id),
  check (offer is null or octet_length(offer) <= 32768),
  check (answer is null or octet_length(answer) <= 32768)
);
alter table public.room_calls enable row level security;
revoke all on public.room_calls from public, anon, authenticated;
create index room_calls_host_expiry_idx on public.room_calls(host_id, expires_at);

create function public.room_call_exchange(
  p_room uuid, p_action text, p_call uuid default null,
  p_guest uuid default null, p_sdp text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  call_row public.room_calls%rowtype;
  creator uuid;
begin
  select created_by into creator from public.rooms
    where id = p_room and archived_at is null and room_type in ('project','team','client');
  if actor is null or creator is null or
     (creator <> actor and not exists (
       select 1 from public.room_members where room_id = p_room and user_id = actor
     )) then return null; end if;

  if p_action = 'create' then
    if p_guest is null or p_guest = actor or (p_guest <> creator and not exists (
      select 1 from public.room_members where room_id = p_room and user_id = p_guest
    )) then return null; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 761));
    delete from public.room_calls where host_id = actor and expires_at <= now();
    if exists (select 1 from public.room_calls where host_id = actor and ended_at is null) then
      raise exception 'End your current call before starting another';
    end if;
    insert into public.room_calls(room_id,host_id,guest_id)
      values(p_room,actor,p_guest) returning * into call_row;
  else
    select * into call_row from public.room_calls
      where id = p_call and room_id = p_room and actor in (host_id,guest_id)
        and expires_at > now() for update;
    if not found then return null; end if;
    -- Recheck both seats; a removed room member cannot keep signaling.
    if exists (
      select 1 from (values (call_row.host_id),(call_row.guest_id)) seats(user_id)
      where seats.user_id <> creator and not exists (
        select 1 from public.room_members m where m.room_id = p_room and m.user_id = seats.user_id
      )
    ) then
      update public.room_calls set ended_at = now(), offer = null, answer = null where id = p_call;
      return null;
    end if;
    if p_action = 'end' then
      update public.room_calls set ended_at = coalesce(ended_at, now()), offer = null, answer = null
        where id = p_call returning * into call_row;
    elsif p_action in ('offer','answer') then
      if call_row.ended_at is not null or p_sdp is null or octet_length(p_sdp) > 32768
         or left(p_sdp, 3) <> 'v=0' then return null; end if;
      if p_action = 'offer' and actor = call_row.host_id and call_row.offer is null then
        update public.room_calls set offer = p_sdp where id = p_call returning * into call_row;
      elsif p_action = 'answer' and actor = call_row.guest_id
            and call_row.offer is not null and call_row.answer is null then
        update public.room_calls set answer = p_sdp where id = p_call returning * into call_row;
      else return null; end if;
    elsif p_action is distinct from 'read' then return null;
    end if;
  end if;
  return jsonb_build_object('id',call_row.id,'host',actor = call_row.host_id,
    'ended',call_row.ended_at is not null,'offer',call_row.offer,'answer',call_row.answer);
end;
$$;
revoke all on function public.room_call_exchange(uuid,text,uuid,uuid,text) from public, anon;
grant execute on function public.room_call_exchange(uuid,text,uuid,uuid,text) to authenticated;
