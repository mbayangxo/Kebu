create or replace function public.record_mail_domain_event(p_mailbox_id uuid,p_event_type text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_type text; v_domain_id uuid; v_domain text;
begin
  select mailbox_type,mail_domain_id,split_part(address,'@',2) into v_type,v_domain_id,v_domain
  from public.mailboxes where id=p_mailbox_id;
  if v_type is null then return; end if;
  if v_type='personal' then
    update public.mail_platform_domains set
      delivered_count=delivered_count+case when p_event_type='email.delivered' then 1 else 0 end,
      hard_bounce_count=hard_bounce_count+case when p_event_type='email.bounced' then 1 else 0 end,
      complaint_count=complaint_count+case when p_event_type='email.complained' then 1 else 0 end,
      delayed_count=delayed_count+case when p_event_type='email.delivery_delayed' then 1 else 0 end,
      suppressed_count=suppressed_count+case when p_event_type='email.suppressed' then 1 else 0 end,
      reputation_status=case when p_event_type='email.complained' and reputation_status<>'paused' then 'watch' else reputation_status end,
      last_provider_event_at=now(),updated_at=now()
    where domain=v_domain;
  elsif v_domain_id is not null then
    update public.mail_domains set
      delivered_count=delivered_count+case when p_event_type='email.delivered' then 1 else 0 end,
      hard_bounce_count=hard_bounce_count+case when p_event_type='email.bounced' then 1 else 0 end,
      complaint_count=complaint_count+case when p_event_type='email.complained' then 1 else 0 end,
      delayed_count=delayed_count+case when p_event_type='email.delivery_delayed' then 1 else 0 end,
      suppressed_count=suppressed_count+case when p_event_type='email.suppressed' then 1 else 0 end,
      reputation_status=case when p_event_type='email.complained' and reputation_status<>'paused' then 'watch' else reputation_status end,
      last_provider_event_at=now(),updated_at=now()
    where id=v_domain_id;
  end if;
end $$;
revoke all on function public.record_mail_domain_event(uuid,text) from public,anon,authenticated;
grant execute on function public.record_mail_domain_event(uuid,text) to service_role;
