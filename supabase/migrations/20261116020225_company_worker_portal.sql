-- Business Kebu workforce operations; Liguey remains an optional recruiting app.
create or replace function private.company_role(p_business uuid)
returns text language sql stable security definer set search_path='' as $$
 select role from public.business_members where business_id=p_business and user_id=(select auth.uid()) and status='active';
$$;
revoke all on function private.company_role(uuid) from public,anon;
grant execute on function private.company_role(uuid) to authenticated;

create table public.company_projects(
 id uuid primary key,business_id uuid not null references public.businesses(id),title text not null check(char_length(trim(title)) between 1 and 160),
 description text not null default '' check(char_length(description)<=4000),status text not null default 'active' check(status in ('active','blocked','done','archived')),
 room_id uuid not null references public.rooms(id),created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),
 unique(business_id,id)
);
alter table public.workspace_items add constraint workspace_items_business_identity unique(business_id,id);
create table public.company_project_tasks(
 id uuid primary key, business_id uuid not null,project_id uuid not null,assignee_user_id uuid not null references auth.users(id),
 foreign key(business_id,project_id) references public.company_projects(business_id,id),
 foreign key(business_id,id) references public.workspace_items(business_id,id) on delete cascade
);
create table public.company_project_feedback(
 id uuid primary key,business_id uuid not null,project_id uuid not null,author_id uuid not null references auth.users(id),
 message text not null check(char_length(trim(message)) between 1 and 4000),created_at timestamptz not null default clock_timestamp(),
 foreign key(business_id,project_id) references public.company_projects(business_id,id)
);
create table public.company_project_resources(
 id uuid primary key,business_id uuid not null,project_id uuid not null,kind text not null check(kind in ('doc','sheet','slide')),
 resource_id uuid not null,label text not null check(char_length(trim(label)) between 1 and 160),created_by uuid not null references auth.users(id),
 foreign key(business_id,project_id) references public.company_projects(business_id,id),unique(project_id,kind,resource_id)
);
create table public.company_learning_modules(
 id uuid primary key,business_id uuid not null references public.businesses(id),title text not null check(char_length(trim(title)) between 1 and 160),
 lesson text not null check(char_length(trim(lesson)) between 1 and 20000),quiz jsonb not null check(jsonb_typeof(quiz)='array' and jsonb_array_length(quiz) between 1 and 10),
 pass_percent integer not null check(pass_percent between 1 and 100),created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),unique(business_id,id)
);
create table public.company_learning_assignments(
 business_id uuid not null,module_id uuid not null,user_id uuid not null references auth.users(id),assigned_at timestamptz not null default clock_timestamp(),
 primary key(module_id,user_id),foreign key(business_id,module_id) references public.company_learning_modules(business_id,id)
);
create table public.company_learning_attempts(
 id uuid primary key,business_id uuid not null,module_id uuid not null,user_id uuid not null,answers jsonb not null,
 score integer not null check(score between 0 and 100),passed boolean not null,created_at timestamptz not null default clock_timestamp(),
 foreign key(module_id,user_id) references public.company_learning_assignments(module_id,user_id),
 foreign key(business_id,module_id) references public.company_learning_modules(business_id,id)
);
create table public.company_hr_requests(
 id uuid primary key,business_id uuid not null references public.businesses(id),user_id uuid not null references auth.users(id),
 category text not null check(category in ('time_off','pay','benefits','workplace','other')),
 message text not null check(char_length(trim(message)) between 1 and 4000),response text not null default '' check(char_length(response)<=4000),
 status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp()
);
create table public.company_shifts(
 id uuid primary key,business_id uuid not null references public.businesses(id),user_id uuid not null references auth.users(id),
 starts_at timestamptz not null,ends_at timestamptz not null,location text not null check(char_length(trim(location)) between 1 and 300),
 status text not null default 'scheduled' check(status in ('scheduled','cancelled')),created_by uuid not null references auth.users(id),
 check(ends_at>starts_at and ends_at<=starts_at+interval '24 hours')
);
create table public.company_benefits(
 id uuid primary key,business_id uuid not null references public.businesses(id),title text not null check(char_length(trim(title)) between 1 and 160),
 details text not null check(char_length(trim(details)) between 1 and 8000),created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp()
);
create table public.company_pay_preferences(
 business_id uuid not null references public.businesses(id),user_id uuid not null references auth.users(id),
 method text not null check(method in ('bank','mobile_money','cash')),updated_at timestamptz not null default clock_timestamp(),primary key(business_id,user_id)
);
-- Employer-entered statements, never a money transfer or a tax calculation.
create table public.company_pay_statements(
 id uuid primary key,business_id uuid not null references public.businesses(id),user_id uuid not null references auth.users(id),
 period_start date not null,period_end date not null,currency text not null check(currency ~ '^[A-Z]{3}$'),
 gross_minor bigint not null check(gross_minor between 0 and 1000000000000),deductions_minor bigint not null,
 net_minor bigint not null,notes text not null default '' check(char_length(notes)<=2000),created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),
 check(period_end>=period_start),check(deductions_minor>=0 and deductions_minor<=gross_minor),check(net_minor=gross_minor-deductions_minor),
 unique(business_id,user_id,period_start,period_end)
);
create index company_projects_business_idx on public.company_projects(business_id,created_at desc);
create index company_tasks_business_idx on public.company_project_tasks(business_id,assignee_user_id);
create index company_feedback_project_idx on public.company_project_feedback(business_id,project_id,created_at desc);
create index company_resources_project_idx on public.company_project_resources(business_id,project_id);
create index company_modules_business_idx on public.company_learning_modules(business_id);
create index company_assignments_person_idx on public.company_learning_assignments(business_id,user_id);
create index company_attempts_person_idx on public.company_learning_attempts(business_id,user_id,created_at desc);
create index company_hr_person_idx on public.company_hr_requests(business_id,user_id,created_at desc);
create index company_shifts_person_idx on public.company_shifts(business_id,user_id,starts_at);
create index company_benefits_business_idx on public.company_benefits(business_id,created_at desc);
create index company_statements_person_idx on public.company_pay_statements(business_id,user_id,period_end desc);

do $$ declare t text;begin
 foreach t in array array['company_projects','company_project_tasks','company_project_feedback','company_project_resources','company_learning_modules','company_learning_assignments','company_learning_attempts','company_hr_requests','company_shifts','company_benefits','company_pay_preferences','company_pay_statements'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create policy company_projects_read on public.company_projects for select to authenticated using(private.company_role(business_id) is not null);
create policy company_tasks_read on public.company_project_tasks for select to authenticated using(private.company_role(business_id) is not null);
create policy company_feedback_read on public.company_project_feedback for select to authenticated using(private.company_role(business_id) is not null);
create policy company_resources_read on public.company_project_resources for select to authenticated using(private.company_role(business_id) is not null);
-- Answer keys are visible only to authorized module authors/managers, never through employee table access.
create policy company_modules_read on public.company_learning_modules for select to authenticated using(private.company_role(business_id) in ('founder','administrator','manager','store_manager'));
create policy company_assignments_read on public.company_learning_assignments for select to authenticated using(private.company_role(business_id) is not null and (user_id=auth.uid() or private.company_role(business_id) in ('founder','administrator','manager','store_manager')));
create policy company_attempts_read on public.company_learning_attempts for select to authenticated using(private.company_role(business_id) is not null and (user_id=auth.uid() or private.company_role(business_id) in ('founder','administrator','manager','store_manager')));
create policy company_hr_read on public.company_hr_requests for select to authenticated using(private.company_role(business_id) is not null and (user_id=auth.uid() or private.company_role(business_id) in ('founder','administrator')));
create policy company_shifts_read on public.company_shifts for select to authenticated using(private.company_role(business_id) is not null and (user_id=auth.uid() or private.company_role(business_id) in ('founder','administrator','manager','store_manager')));
create policy company_benefits_read on public.company_benefits for select to authenticated using(private.company_role(business_id) is not null);
create policy company_preferences_read on public.company_pay_preferences for select to authenticated using(private.company_role(business_id) is not null and (user_id=auth.uid() or private.company_role(business_id) in ('founder','administrator','finance_manager')));
create policy company_statements_read on public.company_pay_statements for select to authenticated using(private.company_role(business_id) is not null and (user_id=auth.uid() or private.company_role(business_id) in ('founder','administrator','finance_manager')));

create or replace function public.company_learning_for_me(p_business uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or private.company_role(p_business) is null then raise exception 'Not allowed';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'lesson',m.lesson,'passPercent',m.pass_percent,
 'questions',(select jsonb_agg(jsonb_build_object('prompt',q->>'prompt','options',q->'options') order by ord) from jsonb_array_elements(m.quiz) with ordinality as qs(q,ord)),
 'passed',exists(select 1 from public.company_learning_attempts a where a.module_id=m.id and a.user_id=auth.uid() and a.passed)))
 from public.company_learning_assignments x join public.company_learning_modules m on m.id=x.module_id
 where x.business_id=p_business and x.user_id=auth.uid()),'[]'::jsonb);
end $$;
revoke all on function public.company_learning_for_me(uuid) from public,anon;
grant execute on function public.company_learning_for_me(uuid) to authenticated;

-- Scoped command boundary. Tables are read-only through the Data API; every mutation
-- validates current company membership, role and resource identity in this transaction.
create or replace function public.company_portal_action(p_business uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();actor_role text:=private.company_role(p_business);
 managed boolean:=actor_role in ('founder','administrator','manager','store_manager');
 hr boolean:=actor_role in ('founder','administrator');finance boolean:=actor_role in ('founder','administrator','finance_manager');
 target uuid;command_id uuid;project public.company_projects%rowtype;module public.company_learning_modules%rowtype;
 question jsonb;answer integer;correct integer:=0;score integer;i integer;existing jsonb;starts timestamptz;ends timestamptz;
begin
 if actor is null or actor_role is null then raise exception 'Not allowed' using errcode='42501';end if;
 if p_data is null or octet_length(p_data::text)>200000 or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid request';end if;
 command_id:=(p_data->>'id')::uuid;
 -- Retry the identical command once only: receipt stores an input fingerprint and result.
 if command_id is null then raise exception 'A request id is required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_business::text||':'||actor::text||':'||command_id::text,0));
 select result into existing from private.company_command_receipts where business_id=p_business and user_id=actor and request_id=command_id and action=p_action and payload=p_data;
 if found then return existing;end if;
 if exists(select 1 from private.company_command_receipts where business_id=p_business and user_id=actor and request_id=command_id) then raise exception 'Request id was reused for different work';end if;
 if p_action in ('project_create','project_status','task_create','module_create','module_assign','shift_create','shift_cancel','benefit_create') and not managed then raise exception 'Manager access required' using errcode='42501';end if;
 if p_action='hr_reply' and not hr then raise exception 'HR access required' using errcode='42501';end if;
 if p_action='statement_create' and not finance then raise exception 'Finance access required' using errcode='42501';end if;
 if p_action in ('task_create','feedback_create','doc_create','resource_attach','project_status') then
  select * into project from public.company_projects where id=(p_data->>'projectId')::uuid and business_id=p_business for update;
  if not found or project.status='archived' then raise exception 'Project is unavailable';end if;
 end if;
 if p_action in ('task_create','module_assign','shift_create','statement_create') then
  target:=(p_data->>'userId')::uuid;
  perform 1 from public.business_members where business_id=p_business and user_id=target and status='active' for share;
  if not found then raise exception 'Choose an active member of this company';end if;
 end if;
 case p_action
 when 'project_create' then
  insert into public.rooms(id,created_by,business_id,name,room_type) values(command_id,actor,p_business,left(p_data->>'title',100),'project');
  insert into public.company_projects(id,business_id,title,description,room_id,created_by) values(command_id,p_business,trim(p_data->>'title'),coalesce(p_data->>'description',''),command_id,actor);
  insert into public.room_members(room_id,user_id,role) select command_id,user_id,'member' from public.business_members where business_id=p_business and status='active' on conflict do nothing;
 when 'project_status' then
  if project.status is distinct from p_data->>'expectedStatus' then raise exception 'Project changed. Reload before updating.';end if;
  update public.company_projects set status=p_data->>'status' where id=project.id;
 when 'task_create' then
  insert into public.workspace_items(id,owner_id,business_id,kind,title,body,status,due_at,visibility)
  values(command_id,actor,p_business,'task',trim(p_data->>'title'),coalesce(p_data->>'body',''),'open',(p_data->>'dueAt')::timestamptz,'team');
  insert into public.company_project_tasks(id,business_id,project_id,assignee_user_id) values(command_id,p_business,project.id,target);
 when 'task_status' then
  perform 1 from public.company_project_tasks t where t.id=(p_data->>'taskId')::uuid and t.business_id=p_business;
  if not found then raise exception 'Task not found';end if;
  if p_data->>'status' not in ('open','done') then raise exception 'Invalid task status';end if;
  update public.workspace_items set status=p_data->>'status',updated_at=clock_timestamp() where id=(p_data->>'taskId')::uuid and business_id=p_business;
 when 'feedback_create' then
  insert into public.company_project_feedback(id,business_id,project_id,author_id,message) values(command_id,p_business,project.id,actor,trim(p_data->>'message'));
 when 'doc_create' then
  insert into public.workspace_items(id,owner_id,business_id,kind,title,body,status,visibility) values(command_id,actor,p_business,'doc',trim(p_data->>'title'),'','draft','team');
  insert into public.company_project_resources(id,business_id,project_id,kind,resource_id,label,created_by) values(command_id,p_business,project.id,'doc',command_id,trim(p_data->>'title'),actor);
 when 'resource_attach' then
  target:=(p_data->>'resourceId')::uuid;
  if p_data->>'kind'='doc' then
   perform 1 from public.workspace_items where id=target and business_id=p_business and kind='doc' and visibility='team';
  elsif p_data->>'kind' in ('sheet','slide') then
   perform 1 from public.library_nodes n where n.id=target and n.kind=p_data->>'kind' and n.trashed_at is null
   and (n.owner_id=actor or exists(select 1 from public.library_shares s where s.node_id=n.id and s.shared_with_user_id=actor));
  else raise exception 'Unsupported resource';end if;
  if not found then raise exception 'You cannot attach this resource';end if;
  insert into public.company_project_resources(id,business_id,project_id,kind,resource_id,label,created_by)
   values(command_id,p_business,project.id,p_data->>'kind',target,trim(p_data->>'label'),actor);
 when 'module_create' then
  if jsonb_typeof(p_data->'quiz')<>'array' or jsonb_array_length(p_data->'quiz') not between 1 and 10 then raise exception 'Add 1–10 questions';end if;
  for question in select * from jsonb_array_elements(p_data->'quiz') loop
   if coalesce(char_length(trim(question->>'prompt')),0) not between 1 and 500 or jsonb_typeof(question->'options')<>'array'
   or jsonb_array_length(question->'options') not between 2 and 6 or jsonb_typeof(question->'correctIndex')<>'number' then raise exception 'Invalid quiz question';end if;
   answer:=(question->>'correctIndex')::integer;
   if answer<0 or answer>=jsonb_array_length(question->'options') or exists(select 1 from jsonb_array_elements(question->'options') option where jsonb_typeof(option)<>'string' or char_length(trim(option#>>'{}')) not between 1 and 300) then raise exception 'Invalid quiz choices';end if;
  end loop;
  insert into public.company_learning_modules(id,business_id,title,lesson,quiz,pass_percent,created_by)
   values(command_id,p_business,trim(p_data->>'title'),p_data->>'lesson',p_data->'quiz',(p_data->>'passPercent')::integer,actor);
 when 'module_assign' then
  perform 1 from public.company_learning_modules where business_id=p_business and id=(p_data->>'moduleId')::uuid;
  if not found then raise exception 'Module not found';end if;
  insert into public.company_learning_assignments(business_id,module_id,user_id) values(p_business,(p_data->>'moduleId')::uuid,target) on conflict do nothing;
 when 'module_answer' then
  if p_data->'acknowledged' is distinct from 'true'::jsonb then raise exception 'Confirm that you reviewed the lesson';end if;
  select m.* into module from public.company_learning_modules m join public.company_learning_assignments x on x.module_id=m.id and x.user_id=actor
  where m.id=(p_data->>'moduleId')::uuid and m.business_id=p_business;
  if not found then raise exception 'Module not assigned to you';end if;
  if jsonb_typeof(p_data->'answers')<>'array' or jsonb_array_length(p_data->'answers')<>jsonb_array_length(module.quiz) then raise exception 'Answer every question';end if;
  for i in 0..jsonb_array_length(module.quiz)-1 loop
   if jsonb_typeof(p_data->'answers'->i)<>'number' then raise exception 'Invalid answer';end if;
   answer:=(p_data->'answers'->>i)::integer;
   if answer<0 or answer>=jsonb_array_length(module.quiz->i->'options') then raise exception 'Invalid answer';end if;
   if answer=(module.quiz->i->>'correctIndex')::integer then correct:=correct+1;end if;
  end loop;
  score:=floor(correct*100.0/jsonb_array_length(module.quiz));
  insert into public.company_learning_attempts(id,business_id,module_id,user_id,answers,score,passed) values(command_id,p_business,module.id,actor,p_data->'answers',score,score>=module.pass_percent);
 when 'hr_create' then
  insert into public.company_hr_requests(id,business_id,user_id,category,message) values(command_id,p_business,actor,p_data->>'category',trim(p_data->>'message'));
 when 'hr_reply' then
  update public.company_hr_requests set response=trim(p_data->>'response'),status=p_data->>'status',updated_at=clock_timestamp()
  where id=(p_data->>'requestId')::uuid and business_id=p_business and updated_at=(p_data->>'expectedUpdatedAt')::timestamptz;
  if not found then raise exception 'HR request not found';end if;
 when 'shift_create' then
  starts:=(p_data->>'startsAt')::timestamptz;ends:=(p_data->>'endsAt')::timestamptz;
  perform pg_advisory_xact_lock(hashtextextended('liguey-interview:'||target::text,0));
  perform pg_advisory_xact_lock(hashtextextended(p_business::text||':shift:'||target::text,0));
  if exists(select 1 from public.liguey_interviews where status in ('proposed','accepted') and starts_at<ends and ends_at>starts and(candidate_id=target or interviewer_id=target)) then raise exception 'This member already has a commitment at that time';end if;
  if exists(select 1 from public.company_shifts where business_id=p_business and user_id=target and status='scheduled' and starts_at<ends and ends_at>starts) then raise exception 'This member already has a shift at that time';end if;
  insert into public.company_shifts(id,business_id,user_id,starts_at,ends_at,location,created_by) values(command_id,p_business,target,starts,ends,trim(p_data->>'location'),actor);
 when 'shift_cancel' then
  update public.company_shifts set status='cancelled' where id=(p_data->>'shiftId')::uuid and business_id=p_business;
  if not found then raise exception 'Shift not found';end if;
 when 'benefit_create' then
  insert into public.company_benefits(id,business_id,title,details,created_by) values(command_id,p_business,trim(p_data->>'title'),trim(p_data->>'details'),actor);
 when 'pay_preference' then
  insert into public.company_pay_preferences(business_id,user_id,method) values(p_business,actor,p_data->>'method')
  on conflict(business_id,user_id) do update set method=excluded.method,updated_at=clock_timestamp();
 when 'member_remove' then
  if not hr then raise exception 'Administrator access required' using errcode='42501';end if;
  target:=(p_data->>'userId')::uuid;
  if target=actor then raise exception 'You cannot remove your own access here';end if;
  update public.business_members set status='removed',updated_at=clock_timestamp() where business_id=p_business and user_id=target and status='active' and role<>'founder';
  if not found then raise exception 'Member cannot be removed';end if;
  update public.business_invites set status='revoked' where business_id=p_business and status='pending' and lower(email)=(select lower(email) from auth.users where id=target);
 when 'statement_create' then
  insert into public.company_pay_statements(id,business_id,user_id,period_start,period_end,currency,gross_minor,deductions_minor,net_minor,notes,created_by)
  values(command_id,p_business,target,(p_data->>'periodStart')::date,(p_data->>'periodEnd')::date,p_data->>'currency',(p_data->>'grossMinor')::bigint,(p_data->>'deductionsMinor')::bigint,(p_data->>'netMinor')::bigint,coalesce(p_data->>'notes',''),actor);
 else raise exception 'Unsupported company action';
 end case;
 existing:=jsonb_build_object('ok',true,'id',command_id,'score',score);
 insert into private.company_command_receipts(business_id,user_id,request_id,action,payload,result) values(p_business,actor,command_id,p_action,p_data,existing);
 insert into public.business_audit_logs(business_id,actor_user_id,action,metadata) values(p_business,actor,'company.'||p_action,jsonb_build_object('requestId',command_id));
 return existing;
end $$;
create table private.company_command_receipts(
 business_id uuid not null references public.businesses(id),user_id uuid not null references auth.users(id),request_id uuid not null,
 action text not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp(),primary key(business_id,user_id,request_id)
);
revoke all on private.company_command_receipts from public,anon,authenticated;
revoke all on function public.company_portal_action(uuid,text,jsonb) from public,anon;
grant execute on function public.company_portal_action(uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';

-- A former employee cannot keep a company room through its creator/member shortcut.
create or replace function public.can_access_room(p_room_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rooms r where r.id=p_room_id and r.archived_at is null
 and (r.created_by=auth.uid() or exists(select 1 from public.room_members m where m.room_id=r.id and m.user_id=auth.uid()))
 and (r.business_id is null or private.company_role(r.business_id) is not null));
$$;
create policy "Company membership required for company rooms" on public.rooms as restrictive for all to authenticated
using(business_id is null or private.company_role(business_id) is not null)
with check(business_id is null or private.company_role(business_id) is not null);
create or replace function private.sync_company_membership_access()
returns trigger language plpgsql security definer set search_path='' as $$
declare b uuid:=coalesce(new.business_id,old.business_id);u uuid:=coalesce(new.user_id,old.user_id);
begin
 if tg_op<>'DELETE' and new.status='active' then
  insert into public.room_members(room_id,user_id,role)
   select room_id,u,'member' from public.company_projects where business_id=b and status<>'archived'
   on conflict(room_id,user_id) do nothing;
 else
  delete from public.room_members m using public.rooms r where m.room_id=r.id and r.business_id=b and m.user_id=u;
  update public.room_call_participants p set left_at=clock_timestamp() from public.room_calls c join public.rooms r on r.id=c.room_id
   where p.call_id=c.id and r.business_id=b and p.user_id=u and p.left_at is null;
  -- Keep the durable CRDT history, rotate its private-channel epoch. Other clients
  -- must reauthorize before sharing more edits; their local conflict recovery stays intact.
  update public.workspace_items set collab_epoch=gen_random_uuid() where business_id=b and kind='doc' and collab_state is not null;
 end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
revoke all on function private.sync_company_membership_access() from public,anon,authenticated;
create trigger company_membership_access_sync after insert or update of status or delete on public.business_members
for each row execute function private.sync_company_membership_access();

create or replace function public.company_roster(p_business uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or private.company_role(p_business) is null then raise exception 'Not allowed';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'role',m.role,'name',coalesce(nullif(p.name,''),'Team member'),'kebuId',p.public_kebu_id))
 from public.business_members m left join public.user_profiles p on p.id=m.user_id where m.business_id=p_business and m.status='active'),'[]'::jsonb);
end $$;
revoke all on function public.company_roster(uuid) from public,anon;
grant execute on function public.company_roster(uuid) to authenticated;

create or replace function public.company_portfolio()
returns jsonb language sql security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',coalesce(b.trading_name,b.legal_name),'kebuId',b.public_kebu_id,
 'role',m.role,'activeProjects',(select count(*) from public.company_projects p where p.business_id=b.id and p.status in ('active','blocked')),
 'blockedProjects',(select count(*) from public.company_projects p where p.business_id=b.id and p.status='blocked'),
 'myOpenTasks',(select count(*) from public.company_project_tasks t join public.workspace_items w on w.id=t.id where t.business_id=b.id and t.assignee_user_id=auth.uid() and w.status='open'),
 'myOpenHR',(select count(*) from public.company_hr_requests h where h.business_id=b.id and h.user_id=auth.uid() and h.status='open'))),'[]'::jsonb)
 from public.business_members m join public.businesses b on b.id=m.business_id where m.user_id=auth.uid() and m.status='active';
$$;
revoke all on function public.company_portfolio() from public,anon;
grant execute on function public.company_portfolio() to authenticated;

create or replace function public.company_prepare_hire(p_application uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare application public.job_applications%rowtype;mail text;invitation public.business_invites%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select * into application from public.job_applications where id=p_application for update;
 if not found or application.status<>'accepted' or not private.is_liguey_manager(application.business_id)
 or not private.can_invite_business_role(application.business_id,'employee') or not private.employer_can_recruit(application.business_id)
 or not exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey') then raise exception 'Accepted application and current employer access required';end if;
 select email into mail from auth.users where id=application.applicant_user_id and email_confirmed_at is not null;
 if mail is null then raise exception 'The applicant must confirm their account email';end if;
 insert into public.business_invites(business_id,email,role,token,invited_by)
 values(application.business_id,lower(mail),'employee',replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),auth.uid())
 on conflict(business_id,lower(email)) where status='pending' do nothing;
 select * into invitation from public.business_invites where business_id=application.business_id and lower(email)=lower(mail) and status='pending';
 if invitation.role<>'employee' or invitation.expires_at<=clock_timestamp() then raise exception 'Review or revoke the existing invitation first';end if;
 return jsonb_build_object('token',invitation.token,'expiresAt',invitation.expires_at);
end $$;
revoke all on function public.company_prepare_hire(uuid) from public,anon;
grant execute on function public.company_prepare_hire(uuid) to authenticated;
