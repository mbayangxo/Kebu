-- Extend the existing Brand DNA identity; no site document/content writes.
alter table public.business_brand_kits
  add column brain_profile jsonb not null default '{}'::jsonb
    check (jsonb_typeof(brain_profile)='object' and octet_length(brain_profile::text)<=100000),
  add column brain_revision bigint not null default 1 check (brain_revision>0);

create function public.advance_brand_brain_revision() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  new.brain_revision:=old.brain_revision+1;
  return new;
end $$;
revoke all on function public.advance_brand_brain_revision() from public,anon,authenticated;
create trigger business_brand_kits_brain_revision before update on public.business_brand_kits
for each row execute function public.advance_brand_brain_revision();

create function public.save_brand_brain(p_id uuid,p_expected bigint,p_fields jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare current_row public.business_brand_kits; incoming public.business_brand_kits; saved public.business_brand_kits; bid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_id is null or p_expected is null or p_expected<0 or jsonb_typeof(p_fields) is distinct from 'object'
     or octet_length(p_fields::text)>200000 then raise exception 'Invalid Brand Brain' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_fields) k where k not in
    ('name','business_id','logo_url','primary_color','accent_color','background_color','text_color','font_display','font_body','tagline','photography_style','voice_tone','languages','customer_notes','products_notes','visual_rules','approved_imagery','brain_profile'))
    or not p_fields ?& array['name','business_id','logo_url','primary_color','accent_color','background_color','text_color','font_display','font_body','tagline','photography_style','voice_tone','languages','customer_notes','products_notes','visual_rules','approved_imagery','brain_profile']
    then raise exception 'Invalid Brand Brain fields' using errcode='22023'; end if;
  incoming:=jsonb_populate_record(null::public.business_brand_kits,p_fields);
  if jsonb_typeof(incoming.brain_profile) is distinct from 'object' or incoming.brain_profile->'version' is distinct from '1'::jsonb
    or not incoming.brain_profile ?& array['version','creative','taste','motion']
    or jsonb_typeof(incoming.brain_profile->'creative') is distinct from 'object'
    or jsonb_typeof(incoming.brain_profile->'taste') is distinct from 'object'
    or jsonb_typeof(incoming.brain_profile->'motion') is distinct from 'object'
    or exists(select 1 from jsonb_object_keys(incoming.brain_profile) k where k not in ('version','creative','taste','motion'))
    then raise exception 'Invalid Brand Brain version or profiles' using errcode='22023'; end if;
  bid:=incoming.business_id;
  if bid is not null and not exists(select 1 from public.businesses where id=bid and created_by=auth.uid()) then
    raise exception 'Business not found' using errcode='42501';
  end if;
  -- Serialize creation/update of a known UUID, including retries of a new profile.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into current_row from public.business_brand_kits where id=p_id and owner_id=auth.uid() for update;
  if found then
    if current_row.brain_revision<>p_expected then raise exception 'Brand Brain changed. Reload the saved profile.' using errcode='40001'; end if;
    update public.business_brand_kits set
      name=incoming.name,business_id=bid,logo_url=incoming.logo_url,primary_color=incoming.primary_color,
      accent_color=incoming.accent_color,background_color=incoming.background_color,text_color=incoming.text_color,
      font_display=incoming.font_display,font_body=incoming.font_body,tagline=incoming.tagline,
      photography_style=incoming.photography_style,voice_tone=incoming.voice_tone,languages=incoming.languages,
      customer_notes=incoming.customer_notes,products_notes=incoming.products_notes,visual_rules=incoming.visual_rules,
      approved_imagery=incoming.approved_imagery,brain_profile=incoming.brain_profile,
      dna_version=least(100,dna_version+1),updated_at=now()
    where id=p_id and owner_id=auth.uid() returning * into saved;
  else
    if p_expected<>0 then raise exception 'Brand Brain not found' using errcode='P0002'; end if;
    insert into public.business_brand_kits(id,owner_id,business_id,name,logo_url,primary_color,accent_color,background_color,text_color,font_display,font_body,tagline,photography_style,voice_tone,languages,customer_notes,products_notes,visual_rules,approved_imagery,brain_profile)
    values(p_id,auth.uid(),bid,incoming.name,incoming.logo_url,incoming.primary_color,incoming.accent_color,incoming.background_color,incoming.text_color,incoming.font_display,incoming.font_body,incoming.tagline,incoming.photography_style,incoming.voice_tone,incoming.languages,incoming.customer_notes,incoming.products_notes,incoming.visual_rules,incoming.approved_imagery,incoming.brain_profile)
    returning * into saved;
  end if;
  return to_jsonb(saved);
end $$;
revoke all on function public.save_brand_brain(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.save_brand_brain(uuid,bigint,jsonb) to authenticated;
notify pgrst,'reload schema';
