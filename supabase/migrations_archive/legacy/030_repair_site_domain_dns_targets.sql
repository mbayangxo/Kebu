-- Repair custom domain rows that still point at obsolete *.kebu.africa DNS targets.

update public.site_domains
set
  dns_target = 'cname.vercel-dns.com',
  last_error = case
    when last_error is not null and last_error ilike '%kebu.africa%' then null
    else last_error
  end,
  updated_at = now()
where dns_target is not null
  and (
    dns_target ilike '%kebu.africa%'
    or dns_target ilike '%alkebulan.com%'
    or dns_target ilike '%alkebulan.co%'
  );
