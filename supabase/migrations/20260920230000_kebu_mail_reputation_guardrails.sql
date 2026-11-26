-- Automatic sender-reputation and mailbox abuse guardrails.

create or replace function public.evaluate_mail_domain_reputation()
returns table(domain text, scope text, status text, delivered bigint, bounces bigint, complaints bigint)
language plpgsql security definer set search_path=public,pg_temp as $$
declare r record; v_total bigint; v_bounce_rate numeric; v_complaint_rate numeric; v_status text;
begin
  for r in select * from public.mail_platform_domains loop
    v_total:=greatest(1,r.delivered_count+r.hard_bounce_count+r.complaint_count);
    v_bounce_rate:=r.hard_bounce_count::numeric/v_total;
    v_complaint_rate:=r.complaint_count::numeric/v_total;
    v_status:=case
      when r.complaint_count>=3 and v_complaint_rate>=0.001 then 'paused'
      when r.hard_bounce_count>=20 and v_bounce_rate>=0.05 then 'paused'
      when r.complaint_count>=1 or (r.hard_bounce_count>=10 and v_bounce_rate>=0.03) then 'watch'
      when r.status='verified' and r.delivered_count>=500 then 'healthy'
      else 'warming' end;
    update public.mail_platform_domains set reputation_status=v_status,
      sending_enabled=case when v_status='paused' then false else sending_enabled end,
      last_health_check_at=now(),updated_at=now()
      where public.mail_platform_domains.domain=r.domain;
    if v_status='paused' and r.reputation_status<>'paused' then
      insert into public.mail_operational_alerts(severity,alert_type,provider,domain,message,metadata)
      values('critical','domain_reputation_paused',r.provider,r.domain,
        'External mail sending was paused automatically to protect domain reputation.',
        jsonb_build_object('bounceRate',v_bounce_rate,'complaintRate',v_complaint_rate,'delivered',r.delivered_count));
    end if;
    domain:=r.domain;scope:='platform';status:=v_status;delivered:=r.delivered_count;bounces:=r.hard_bounce_count;complaints:=r.complaint_count;return next;
  end loop;
  for r in select * from public.mail_domains loop
    v_total:=greatest(1,r.delivered_count+r.hard_bounce_count+r.complaint_count);
    v_bounce_rate:=r.hard_bounce_count::numeric/v_total;
    v_complaint_rate:=r.complaint_count::numeric/v_total;
    v_status:=case
      when r.complaint_count>=3 and v_complaint_rate>=0.001 then 'paused'
      when r.hard_bounce_count>=20 and v_bounce_rate>=0.05 then 'paused'
      when r.complaint_count>=1 or (r.hard_bounce_count>=10 and v_bounce_rate>=0.03) then 'watch'
      when r.status='verified' and r.delivered_count>=500 then 'healthy'
      else 'warming' end;
    update public.mail_domains set reputation_status=v_status,
      sending_enabled=case when v_status='paused' then false else sending_enabled end,
      last_health_check_at=now(),updated_at=now() where id=r.id;
    if v_status='paused' and r.reputation_status<>'paused' then
      insert into public.mail_operational_alerts(severity,alert_type,provider,domain,message,metadata)
      values('critical','domain_reputation_paused',r.provider,r.domain,
        'External business mail sending was paused automatically to protect domain reputation.',
        jsonb_build_object('bounceRate',v_bounce_rate,'complaintRate',v_complaint_rate,'delivered',r.delivered_count));
    end if;
    domain:=r.domain;scope:='business';status:=v_status;delivered:=r.delivered_count;bounces:=r.hard_bounce_count;complaints:=r.complaint_count;return next;
  end loop;
end $$;
revoke all on function public.evaluate_mail_domain_reputation() from public,anon,authenticated;
grant execute on function public.evaluate_mail_domain_reputation() to service_role;

create table if not exists public.mailbox_risk_state (
  mailbox_id uuid primary key references public.mailboxes(id) on delete cascade,
  status text not null default 'normal' check(status in ('normal','watch','restricted','blocked')),
  score integer not null default 0 check(score between 0 and 100),
  complaint_count bigint not null default 0,
  hard_bounce_count bigint not null default 0,
  suppressed_attempt_count bigint not null default 0,
  last_event_at timestamptz,
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.mailbox_risk_state enable row level security;
revoke all on public.mailbox_risk_state from anon,authenticated;
grant all on public.mailbox_risk_state to service_role;

create or replace function public.record_mailbox_risk_event(p_mailbox_id uuid,p_event_type text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_delta integer:=case when p_event_type='email.complained' then 35 when p_event_type='email.bounced' then 5 when p_event_type='email.suppressed' then 3 else 0 end;
begin
  insert into public.mailbox_risk_state(mailbox_id,status,score,complaint_count,hard_bounce_count,suppressed_attempt_count,last_event_at)
  values(p_mailbox_id,case when v_delta>=35 then 'watch' else 'normal' end,least(100,v_delta),
    case when p_event_type='email.complained' then 1 else 0 end,
    case when p_event_type='email.bounced' then 1 else 0 end,
    case when p_event_type='email.suppressed' then 1 else 0 end,now())
  on conflict(mailbox_id) do update set
    score=least(100,public.mailbox_risk_state.score+v_delta),
    complaint_count=public.mailbox_risk_state.complaint_count+case when p_event_type='email.complained' then 1 else 0 end,
    hard_bounce_count=public.mailbox_risk_state.hard_bounce_count+case when p_event_type='email.bounced' then 1 else 0 end,
    suppressed_attempt_count=public.mailbox_risk_state.suppressed_attempt_count+case when p_event_type='email.suppressed' then 1 else 0 end,
    last_event_at=now(),
    status=case when least(100,public.mailbox_risk_state.score+v_delta)>=80 then 'blocked'
                when least(100,public.mailbox_risk_state.score+v_delta)>=60 then 'restricted'
                when least(100,public.mailbox_risk_state.score+v_delta)>=30 then 'watch' else 'normal' end,
    blocked_until=case when least(100,public.mailbox_risk_state.score+v_delta)>=80 then now()+interval '24 hours' else public.mailbox_risk_state.blocked_until end,
    updated_at=now();
end $$;
revoke all on function public.record_mailbox_risk_event(uuid,text) from public,anon,authenticated;
grant execute on function public.record_mailbox_risk_event(uuid,text) to service_role;
