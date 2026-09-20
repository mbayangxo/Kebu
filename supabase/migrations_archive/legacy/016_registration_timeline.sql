-- Align registration progress timeline with canonical Business Registration tracker

update public.registration_progress set label = 'Application Started', sort_order = 10
  where step_key = 'business_created';

update public.registration_progress set label = 'Documents Uploaded', sort_order = 20
  where step_key = 'documents_uploaded';

update public.registration_progress set label = 'Identity Verified', sort_order = 30
  where step_key = 'business_information_complete';

update public.registration_progress set label = 'Government Review', sort_order = 40
  where step_key = 'government_review';

update public.registration_progress set label = 'Registration Approved', sort_order = 60
  where step_key = 'approved';

update public.registration_progress set label = 'Registration Certificate Ready', sort_order = 70
  where step_key = 'registration_certificate';

update public.registration_progress set label = 'Business Active', sort_order = 90
  where step_key = 'active_business';

delete from public.registration_progress
  where step_key in ('ready_to_submit', 'submitted');

insert into public.registration_progress (business_id, step_key, label, sort_order, is_complete)
select b.id, 'payment_confirmed', 'Payment Confirmed', 50, false
from public.businesses b
where not exists (
  select 1 from public.registration_progress rp
  where rp.business_id = b.id and rp.step_key = 'payment_confirmed'
);

insert into public.registration_progress (business_id, step_key, label, sort_order, is_complete)
select b.id, 'tax_registration', 'Tax Registration', 80, false
from public.businesses b
where not exists (
  select 1 from public.registration_progress rp
  where rp.business_id = b.id and rp.step_key = 'tax_registration'
);
