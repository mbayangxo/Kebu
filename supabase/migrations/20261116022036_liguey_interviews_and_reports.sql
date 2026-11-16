create table public.liguey_interviews(
 id uuid primary key,business_id uuid not null references public.businesses(id),application_id uuid not null references public.job_applications(id),
 candidate_id uuid not null references auth.users(id),interviewer_id uuid not null references auth.users(id),
 kind text not null check(kind in ('online','office')),office_address text not null default '',
 starts_at timestamptz not null,ends_at timestamptz not null,room_id uuid references public.rooms(id),
 status text not null default 'proposed' check(status in ('proposed','accepted','declined','cancelled')),
 revision integer not null default 1,created_at timestamptz not null default clock_timestamp(),
 check(ends_at>starts_at and ends_at<=starts_at+interval '4 hours'),
 check((kind='online' and room_id is not null and office_address='') or(kind='office' and room_id is null and char_length(office_address)>=10))
);
create index liguey_interviews_business_idx on public.liguey_interviews(business_id,starts_at);
create index liguey_interviews_candidate_idx on public.liguey_interviews(candidate_id,starts_at);
create index liguey_interviews_interviewer_idx on public.liguey_interviews(interviewer_id,starts_at);
alter table public.liguey_interviews enable row level security;
revoke all on public.liguey_interviews from public,anon,authenticated;
grant select on public.liguey_interviews to authenticated;
grant all on public.liguey_interviews to service_role;
create policy interviews_participants_read on public.liguey_interviews for select to authenticated
using(candidate_id=auth.uid() or private.is_liguey_manager(business_id));

create or replace function private.interview_current(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.liguey_interviews i join public.business_members m on m.business_id=i.business_id and m.user_id=i.interviewer_id
 join public.job_applications a on a.id=i.application_id
 where i.id=p_id and m.status='active' and m.role in ('founder','administrator','store_manager')
 and a.status in ('submitted','reviewed','accepted') and private.employer_can_recruit(i.business_id)
 and(i.kind='online' or exists(select 1 from public.business_employer_verifications v where v.business_id=i.business_id and v.office_checked and v.office_address=i.office_address)));
$$;
revoke all on function private.interview_current(uuid) from public,anon;
grant execute on function private.interview_current(uuid) to authenticated;
create or replace function public.liguey_interview_state(p_business uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if p_business is not null and not private.is_liguey_manager(p_business) then raise exception 'Not allowed';end if;
 return jsonb_build_object('interviews',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('currentReview',private.interview_current(i.id))) from public.liguey_interviews i where p_business is null or i.business_id=p_business),'[]'::jsonb),
 'applications',case when p_business is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'candidateId',a.applicant_user_id,'listingId',a.listing_id,'status',a.status)) from public.job_applications a where a.business_id=p_business and a.status in ('submitted','reviewed','accepted')),'[]'::jsonb) end);
end $$;
revoke all on function public.liguey_interview_state(uuid) from public,anon;
grant execute on function public.liguey_interview_state(uuid) to authenticated;

create or replace function public.liguey_propose_interview(p_id uuid,p_application uuid,p_start timestamptz,p_end timestamptz,p_kind text)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.job_applications%rowtype;v public.business_employer_verifications%rowtype;i public.liguey_interviews%rowtype;u uuid;room uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey') then raise exception 'Add Liguey first';end if;
 select * into a from public.job_applications where id=p_application;
 if not found or a.status not in ('submitted','reviewed','accepted') or not private.is_liguey_manager(a.business_id) or not private.employer_can_recruit(a.business_id) then raise exception 'Current company/recruiter review and application access required';end if;
 if p_start<=clock_timestamp() or p_end<=p_start or p_end>p_start+interval '4 hours' or p_kind not in ('online','office') then raise exception 'Choose a future interview of up to four hours';end if;
 -- Consistent participant lock ordering serializes overlapping requests from different companies.
 for u in select x from unnest(array[auth.uid(),a.applicant_user_id]) x order by x loop perform pg_advisory_xact_lock(hashtextextended('liguey-interview:'||u::text,0));end loop;
 select * into i from public.liguey_interviews where id=p_id;
 if found then
  if i.application_id=p_application and i.interviewer_id=auth.uid() and i.starts_at=p_start and i.ends_at=p_end and i.kind=p_kind then return p_id;end if;
  raise exception 'Interview request id was reused';
 end if;
 if exists(select 1 from public.liguey_interviews where status in ('proposed','accepted') and starts_at<p_end and ends_at>p_start and(candidate_id in(auth.uid(),a.applicant_user_id) or interviewer_id in(auth.uid(),a.applicant_user_id)))
 or exists(select 1 from public.company_shifts where status='scheduled' and user_id in(auth.uid(),a.applicant_user_id) and starts_at<p_end and ends_at>p_start) then raise exception 'A participant already has a commitment at this time';end if;
 select * into v from public.business_employer_verifications where business_id=a.business_id;
 if p_kind='office' and(not v.office_checked or char_length(trim(v.office_address))<10) then raise exception 'A reviewed office is required for an in-person interview';end if;
 if p_kind='online' then
  room:=p_id;insert into public.rooms(id,created_by,name,room_type) values(room,auth.uid(),'Private Liguey interview','client');
 end if;
 insert into public.liguey_interviews(id,business_id,application_id,candidate_id,interviewer_id,kind,office_address,starts_at,ends_at,room_id)
 values(p_id,a.business_id,a.id,a.applicant_user_id,auth.uid(),p_kind,case when p_kind='office' then v.office_address else '' end,p_start,p_end,room);
 insert into public.business_audit_logs(business_id,actor_user_id,action,metadata) values(a.business_id,auth.uid(),'liguey.interview_proposed',jsonb_build_object('interviewId',p_id));
 return p_id;
end $$;
revoke all on function public.liguey_propose_interview(uuid,uuid,timestamptz,timestamptz,text) from public,anon;
grant execute on function public.liguey_propose_interview(uuid,uuid,timestamptz,timestamptz,text) to authenticated;

create table public.liguey_interview_calendar(interview_id uuid not null references public.liguey_interviews(id),user_id uuid not null references auth.users(id),item_id uuid not null references public.workspace_items(id),primary key(interview_id,user_id));
alter table public.liguey_interview_calendar enable row level security;
revoke all on public.liguey_interview_calendar from public,anon,authenticated;
create or replace function public.liguey_respond_interview(p_id uuid,p_revision integer,p_status text)
returns boolean language plpgsql security definer set search_path='' as $$
declare i public.liguey_interviews%rowtype;u uuid;item uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select * into i from public.liguey_interviews where id=p_id for update;
 if not found or not(i.candidate_id=auth.uid() or private.is_liguey_manager(i.business_id)) then raise exception 'Not allowed';end if;
 if i.revision<>p_revision then return false;end if;
 if p_status in ('accepted','declined') then
  if i.candidate_id<>auth.uid() or i.status<>'proposed' then raise exception 'Only this candidate can answer a pending invitation';end if;
  if p_status='accepted' and(not exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey') or not private.interview_current(i.id) or i.starts_at<=clock_timestamp()) then raise exception 'Interview review changed or its time passed';end if;
 elsif p_status='cancelled' then
  if i.status not in ('proposed','accepted') then return false;end if;
 else raise exception 'Invalid interview response';end if;
 update public.liguey_interviews set status=p_status,revision=revision+1 where id=i.id;
 if p_status='accepted' then
  if i.room_id is not null then insert into public.room_members(room_id,user_id,role)values(i.room_id,i.candidate_id,'member') on conflict do nothing;end if;
  foreach u in array array[i.candidate_id,i.interviewer_id] loop
   item:=gen_random_uuid();insert into public.workspace_items(id,owner_id,kind,title,body,status,start_at,end_at,visibility)
    values(item,u,'event','Liguey interview',case when i.kind='online' then 'Private interview room: /rooms/'||i.room_id::text else 'Reviewed office: '||i.office_address end,'open',i.starts_at,i.ends_at,'private');
   insert into public.liguey_interview_calendar values(i.id,u,item);
  end loop;
 else
  if i.room_id is not null then
   update public.rooms set archived_at=clock_timestamp() where id=i.room_id;
   update public.room_calls set ended_at=clock_timestamp() where room_id=i.room_id and ended_at is null;
  end if;
  update public.workspace_items w set title='Cancelled: Liguey interview',status='done' from public.liguey_interview_calendar c where c.item_id=w.id and c.interview_id=i.id;
 end if;
 return true;
end $$;
revoke all on function public.liguey_respond_interview(uuid,integer,text) from public,anon;
grant execute on function public.liguey_respond_interview(uuid,integer,text) to authenticated;

-- A live interview also loses room access when registration, recruiter authority,
-- consent or application status changes. Existing media clients recheck periodically.
create or replace function public.can_access_room(p_room_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rooms r where r.id=p_room_id and r.archived_at is null
 and (r.created_by=auth.uid() or exists(select 1 from public.room_members m where m.room_id=r.id and m.user_id=auth.uid()))
 and (r.business_id is null or private.company_role(r.business_id) is not null)
 and not exists(select 1 from public.liguey_interviews i where i.room_id=r.id and (i.status<>'accepted' or not private.interview_current(i.id))));
$$;
create table public.liguey_safety_reports(
 id uuid primary key,business_id uuid not null references public.businesses(id),author_id uuid not null references auth.users(id),
 message text not null check(char_length(trim(message)) between 10 and 4000),created_at timestamptz not null default clock_timestamp()
);
create index liguey_reports_business_idx on public.liguey_safety_reports(business_id,created_at desc);
alter table public.liguey_safety_reports enable row level security;
revoke all on public.liguey_safety_reports from public,anon,authenticated;
grant select on public.liguey_safety_reports to authenticated;grant all on public.liguey_safety_reports to service_role;
create policy safety_report_author_read on public.liguey_safety_reports for select to authenticated using(author_id=auth.uid());
create or replace function public.liguey_report_company(p_id uuid,p_business uuid,p_message text)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey') then raise exception 'Add Liguey first';end if;
 insert into public.liguey_safety_reports(id,business_id,author_id,message) values(p_id,p_business,auth.uid(),trim(p_message)) on conflict do nothing;
 if not exists(select 1 from public.liguey_safety_reports where id=p_id and business_id=p_business and author_id=auth.uid() and message=trim(p_message)) then raise exception 'Report id was reused';end if;
 return p_id;
end $$;
revoke all on function public.liguey_report_company(uuid,uuid,text) from public,anon;
grant execute on function public.liguey_report_company(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
