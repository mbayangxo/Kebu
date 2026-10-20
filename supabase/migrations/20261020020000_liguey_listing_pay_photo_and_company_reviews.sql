-- Kebu Liguey — listing pay/photo fields, and real employment-verified
-- company reviews (requested directly: "add how much it is... add
-- about the company... people can start rating companies... reviews on
-- companies that worked here, anonymous, and put their name if they
-- want").
--
-- Deliberately NOT a "business credit score" / "bad business bureau"
-- composite number: .cursor/rules/kebu-ka-score.mdc is explicit that
-- "customer reviews" must not be in KA Score's first slice, and that no
-- KA Score work starts until that slice is explicitly assigned. Nothing
-- here computes or stores a score — only a real average rating + real
-- review text, surfaced honestly as reviews, not as a credit signal.
--
-- "Worked here" is enforced for real, not merely claimed: a review's
-- application_id must reference a job_applications row with
-- status = 'accepted' belonging to that same reviewer and business
-- (checked in the INSERT policy below). A reviewer cannot invent an
-- employment relationship that never existed. Anonymity is the
-- reviewer's own choice per row (is_anonymous) — the business can never
-- see or suppress a review (no UPDATE/DELETE grant to business members
-- at all), matching the product's own "malicious review spikes must not
-- destroy a score" spirit in the other direction: a business cannot
-- erase a real one either.

alter table public.job_listings
  add column pay_label text not null default '' check (char_length(pay_label) <= 60),
  add column photo_url text not null default '' check (char_length(photo_url) <= 500);

grant update (pay_label) on public.job_listings to authenticated;
grant insert (pay_label) on public.job_listings to authenticated;
-- photo_url is never client-insertable at creation time — it is only
-- ever set by the dedicated upload route (see photo route below), which
-- uses the signed-in manager's own client and this same column grant,
-- the same shape as businesses.logo_url via app/api/businesses/[id]/logo.
grant update (photo_url) on public.job_listings to authenticated;

create table public.liguey_company_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.job_applications(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  body text not null default '' check (char_length(body) <= 2000),
  is_anonymous boolean not null default false,
  status text not null default 'visible' check (status in ('visible', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, reviewer_user_id)
);

create index liguey_company_reviews_business_idx on public.liguey_company_reviews (business_id, status, created_at desc);

drop trigger if exists liguey_company_reviews_set_updated_at on public.liguey_company_reviews;
create trigger liguey_company_reviews_set_updated_at
  before update on public.liguey_company_reviews
  for each row execute function public.set_updated_at();

-- A review's identity (who wrote it, about which business, proven by
-- which application) can never be reassigned after creation — same
-- convention as guard_job_application_identity. Status, rating and body
-- may always be edited by the author (withdraw by setting 'removed',
-- edit/restore by setting 'visible' again) — the one real guarantee is
-- that only the author who was actually hired there can ever touch it.
create or replace function private.guard_liguey_company_review_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id
      or new.business_id is distinct from old.business_id
      or new.reviewer_user_id is distinct from old.reviewer_user_id
      or new.application_id is distinct from old.application_id
    then
      raise exception 'A review''s business, reviewer or application cannot be changed.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_liguey_company_review_identity() from public;
drop trigger if exists guard_liguey_company_review_identity on public.liguey_company_reviews;
create trigger guard_liguey_company_review_identity before update on public.liguey_company_reviews
for each row execute function private.guard_liguey_company_review_identity();

alter table public.liguey_company_reviews enable row level security;

create policy "Visible reviews are readable by any signed-in user"
  on public.liguey_company_reviews for select to authenticated
  using (status = 'visible');

create policy "A reviewer can always read their own review"
  on public.liguey_company_reviews for select to authenticated
  using (reviewer_user_id = auth.uid());

-- job_applications already grants the applicant SELECT on their own
-- rows (applicant_user_id = auth.uid()), so this subquery runs under the
-- reviewer's own real permissions — no SECURITY DEFINER helper needed,
-- unlike job_listings' public-reach gap.
create policy "Workers review businesses that actually hired them"
  on public.liguey_company_reviews for insert to authenticated
  with check (
    reviewer_user_id = auth.uid()
    and exists (
      select 1 from public.job_applications a
      where a.id = application_id
        and a.business_id = liguey_company_reviews.business_id
        and a.applicant_user_id = auth.uid()
        and a.status = 'accepted'
    )
  );

create policy "A reviewer can edit or withdraw their own review"
  on public.liguey_company_reviews for update to authenticated
  using (reviewer_user_id = auth.uid())
  with check (reviewer_user_id = auth.uid());

-- No UPDATE/DELETE policy for business members at all — a reviewed
-- business can read (via the "visible reviews" policy, same as anyone
-- else) but never edit, hide, or delete someone else's real review.

revoke all on public.liguey_company_reviews from anon, authenticated;
revoke insert, update, delete on public.liguey_company_reviews from anon;
grant select on public.liguey_company_reviews to authenticated;
-- status is included in the INSERT grant (not just UPDATE) because the
-- API always sets it explicitly on upsert — including the restore path,
-- where re-submitting after a withdrawal must bring status back to
-- 'visible' as part of the same write.
grant insert (business_id, reviewer_user_id, application_id, rating, body, is_anonymous, status) on public.liguey_company_reviews to authenticated;
grant update (rating, body, is_anonymous, status) on public.liguey_company_reviews to authenticated;
grant all on public.liguey_company_reviews to service_role;
