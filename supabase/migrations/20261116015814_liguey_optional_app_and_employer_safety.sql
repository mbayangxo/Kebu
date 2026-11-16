-- Liguey is an optional Kebu app, never a separate login or an automatic signup.
alter table public.kebu_builtin_app_installs drop constraint kebu_builtin_app_installs_app_key_check;
alter table public.kebu_builtin_app_installs add constraint kebu_builtin_app_installs_app_key_check check(app_key in ('live-rooms','friends','liguey'));
create or replace function private.is_liguey_manager(p_business uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_members where business_id=p_business and user_id=(select auth.uid()) and status='active' and role in ('founder','administrator','store_manager'));
$$;
revoke all on function private.is_liguey_manager(uuid) from public,anon;
grant execute on function private.is_liguey_manager(uuid) to authenticated;

create table public.business_employer_verifications(
 business_id uuid primary key references public.businesses(id) on delete cascade,
 country_code text not null check(country_code ~ '^[A-Z]{2}$'),
 registry_authority text not null check(char_length(trim(registry_authority)) between 2 and 160),
 registration_number text not null check(char_length(trim(registration_number)) between 2 and 120),
 registry_url text not null check(registry_url ~ '^https://[^[:space:]]+$' and char_length(registry_url)<=2000),
 recruiter_name text not null check(char_length(trim(recruiter_name)) between 2 and 120),
 office_address text not null default '' check(char_length(office_address)<=500),
 status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
 registry_checked boolean not null default false,
 recruiter_checked boolean not null default false,
 office_checked boolean not null default false,
 review_note text not null default '' check(char_length(review_note)<=2000),
 reviewed_at timestamptz,expires_at timestamptz,
 updated_at timestamptz not null default clock_timestamp(),
 check(status<>'approved' or (registry_checked and recruiter_checked and reviewed_at is not null and expires_at>reviewed_at)),
 check(not office_checked or char_length(trim(office_address))>=10)
);
alter table public.business_employer_verifications enable row level security;
revoke all on public.business_employer_verifications from public,anon,authenticated;
grant select on public.business_employer_verifications to authenticated;
grant all on public.business_employer_verifications to service_role;
create policy "Hiring managers read their review" on public.business_employer_verifications for select to authenticated using(private.is_liguey_manager(business_id));
create or replace function private.employer_can_recruit(p_business uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_employer_verifications v join public.businesses b on b.id=v.business_id
 where v.business_id=p_business and v.status='approved' and v.registry_checked and v.recruiter_checked
 and v.expires_at>clock_timestamp() and b.lifecycle_status='active');
$$;
revoke all on function private.employer_can_recruit(uuid) from public,anon;
grant execute on function private.employer_can_recruit(uuid) to authenticated;

create or replace function public.liguey_request_verification(p_business uuid,p_country text,p_authority text,p_number text,p_url text,p_recruiter text,p_office text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_liguey_manager(p_business)
 or not exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey') then raise exception 'Not allowed'; end if;
 insert into public.business_employer_verifications(business_id,country_code,registry_authority,registration_number,registry_url,recruiter_name,office_address)
 values(p_business,upper(trim(p_country)),trim(p_authority),trim(p_number),trim(p_url),trim(p_recruiter),trim(p_office))
 on conflict(business_id) do update set country_code=excluded.country_code,registry_authority=excluded.registry_authority,
 registration_number=excluded.registration_number,registry_url=excluded.registry_url,recruiter_name=excluded.recruiter_name,
 office_address=excluded.office_address,status='pending',registry_checked=false,recruiter_checked=false,office_checked=false,
 review_note='',reviewed_at=null,expires_at=null,updated_at=clock_timestamp();
end $$;
revoke all on function public.liguey_request_verification(uuid,text,text,text,text,text,text) from public,anon;
grant execute on function public.liguey_request_verification(uuid,text,text,text,text,text,text) to authenticated;

create or replace function private.guard_liguey_publishing()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('draft','published') then
  if auth.uid() is null or not exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey') then
   raise exception 'Add Liguey from the Kebu App Store first.';
  end if;
  if new.status='published' and not private.employer_can_recruit(new.business_id) then
   raise exception 'An active company registration and recruiter review is required before publishing.';
  end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_liguey_publishing() from public,anon,authenticated;
create trigger job_listings_require_review before insert or update on public.job_listings for each row execute function private.guard_liguey_publishing();
create or replace function private.is_published_job_listing(p_listing_id uuid,p_business_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.job_listings l where l.id=p_listing_id and l.business_id=p_business_id and l.status='published')
 and private.employer_can_recruit(p_business_id)
 and exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey');
$$;
-- Existing execute grants are retained on the replaced application-policy helper.
notify pgrst,'reload schema';

create table public.employer_review_events(
 id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id),
 decision text not null,note text not null,registry_checked boolean not null,recruiter_checked boolean not null,
 office_checked boolean not null,created_at timestamptz not null default clock_timestamp()
);
alter table public.employer_review_events enable row level security;
revoke all on public.employer_review_events from public,anon,authenticated;
grant all on public.employer_review_events to service_role;
create or replace function public.liguey_review_employer(p_business uuid,p_revision timestamptz,p_status text,p_registry boolean,p_recruiter boolean,p_office boolean,p_note text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v public.business_employer_verifications%rowtype;
begin
 if p_status not in ('approved','rejected','suspended') or char_length(trim(p_note))<20 then raise exception 'A review decision and substantive note are required.'; end if;
 select * into v from public.business_employer_verifications where business_id=p_business for update;
 if not found or v.updated_at<>p_revision then return false; end if;
 if p_status='approved' and not (p_registry and p_recruiter) then raise exception 'Registration and recruiter authority must both be checked.'; end if;
 if p_office and char_length(trim(v.office_address))<10 then raise exception 'An office address is required.'; end if;
 update public.business_employer_verifications set status=p_status,registry_checked=p_registry,recruiter_checked=p_recruiter,
 office_checked=p_office,review_note=trim(p_note),reviewed_at=clock_timestamp(),
 expires_at=case when p_status='approved' then clock_timestamp()+interval '90 days' else null end,
 updated_at=greatest(clock_timestamp(),v.updated_at+interval '1 microsecond') where business_id=p_business;
 insert into public.employer_review_events(business_id,decision,note,registry_checked,recruiter_checked,office_checked)
 values(p_business,p_status,trim(p_note),p_registry,p_recruiter,p_office);
 return true;
end $$;
revoke all on function public.liguey_review_employer(uuid,timestamptz,text,boolean,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.liguey_review_employer(uuid,timestamptz,text,boolean,boolean,boolean,text) to service_role;

-- A general company membership never grants access to recruitment files.
-- Restrictive policy also narrows the profile/evidence policies which consult applications.
create policy "Recruitment is private to applicant and hiring managers"
 on public.job_applications as restrictive for select to authenticated
 using (applicant_user_id = auth.uid() or private.is_liguey_manager(business_id));
do $$begin
 if to_regclass('public.liguey_applicant_insights') is not null then
  execute 'create policy "Recruitment insight confidentiality" on public.liguey_applicant_insights as restrictive for select to authenticated using (private.is_liguey_manager(business_id))';
 end if;
end$$;
