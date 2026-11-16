-- Accept, membership and audit are one transaction. No caller-supplied identity/email.
create schema if not exists private;
create or replace function private.can_invite_business_role(p_business uuid, p_role text)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.business_members m where m.business_id=p_business
   and m.user_id=(select auth.uid()) and m.status='active' and (
     (m.role in ('founder','administrator') and p_role in ('cofounder','administrator','finance_manager','store_manager','manager','creative','developer','designer','employee','accountant','legal_representative','viewer'))
     or (m.role in ('manager','store_manager') and p_role in ('creative','developer','designer','employee','viewer'))));
$$;
revoke all on function private.can_invite_business_role(uuid,text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_invite_business_role(uuid,text) to authenticated;

drop policy if exists "Managers read business invites" on public.business_invites;
drop policy if exists "Managers write business invites" on public.business_invites;
create policy "Team managers read invites" on public.business_invites for select to authenticated
using (private.can_invite_business_role(business_id,role));
create policy "Team managers create invites" on public.business_invites for insert to authenticated
with check (invited_by=(select auth.uid()) and status='pending' and accepted_user_id is null and accepted_at is null
  and private.can_invite_business_role(business_id,role));
create policy "Team managers revoke invites" on public.business_invites for update to authenticated
using (status='pending' and private.can_invite_business_role(business_id,role))
with check (status='revoked' and accepted_user_id is null and accepted_at is null
  and private.can_invite_business_role(business_id,role));
-- Never allow a direct Data API update to turn a normal invite into another identity/role.
create or replace function private.keep_business_invite_identity()
returns trigger language plpgsql set search_path='' as $$
begin
 if row(new.business_id,new.email,new.role,new.token,new.invited_by,new.expires_at)
    is distinct from row(old.business_id,old.email,old.role,old.token,old.invited_by,old.expires_at) then
   raise exception 'Revoke this invitation and create a new one to change its identity or role.';
 end if;
 return new;
end $$;
revoke all on function private.keep_business_invite_identity() from public,anon,authenticated;
create trigger business_invites_keep_identity before update on public.business_invites
for each row execute function private.keep_business_invite_identity();

create or replace function private.accept_business_invite(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid();
 actor_email text;
 invitation public.business_invites%rowtype;
 membership public.business_members%rowtype;
 inviter public.business_members%rowtype;
begin
 if actor is null then return jsonb_build_object('ok',false,'status',401,'error','Sign in required.'); end if;
 select lower(trim(email)) into actor_email from auth.users where id=actor and email_confirmed_at is not null;
 if actor_email is null then return jsonb_build_object('ok',false,'status',403,'error','Confirm your account email before accepting an invitation.'); end if;
 select * into invitation from public.business_invites where token=p_token for update;
 if not found or lower(trim(invitation.email))<>actor_email then
   return jsonb_build_object('ok',false,'status',404,'error','Invitation not found for this account.');
 end if;
 -- Serializes two invitations for the same business/account, including when no membership row exists.
 perform pg_advisory_xact_lock(hashtextextended(invitation.business_id::text||':'||actor::text,0));
 select * into membership from public.business_members where business_id=invitation.business_id and user_id=actor for update;
 if invitation.status='accepted' then
   if invitation.accepted_user_id=actor and membership.status='active' then
     return jsonb_build_object('ok',true,'businessId',invitation.business_id,'role',membership.role);
   end if;
   return jsonb_build_object('ok',false,'status',409,'error','Invitation was already used. Ask the company for a new invitation.');
 end if;
 if invitation.status<>'pending' then return jsonb_build_object('ok',false,'status',410,'error','Invitation is no longer available.'); end if;
 if invitation.expires_at<=clock_timestamp() then
   update public.business_invites set status='expired' where id=invitation.id;
   return jsonb_build_object('ok',false,'status',410,'error','Invitation expired.');
 end if;
 -- Lock the inviter against concurrent removal/demotion while granting access.
 select * into inviter from public.business_members where business_id=invitation.business_id and user_id=invitation.invited_by for share;
 if inviter.status is distinct from 'active' or not (
    inviter.role in ('founder','administrator') or
    (inviter.role in ('manager','store_manager') and invitation.role in ('creative','developer','designer','employee','viewer'))
 ) then return jsonb_build_object('ok',false,'status',403,'error','The inviter can no longer grant this access.'); end if;
 if membership.id is not null and membership.status<>'active' and membership.updated_at>=invitation.created_at then
   return jsonb_build_object('ok',false,'status',409,'error','Access was removed after this invitation. Ask for a new invitation.');
 end if;
 if membership.id is null then
   insert into public.business_members(business_id,user_id,role,status)
   values(invitation.business_id,actor,invitation.role,'active') returning * into membership;
 elsif membership.status<>'active' then
   update public.business_members set role=invitation.role,status='active',updated_at=clock_timestamp()
   where id=membership.id returning * into membership;
 end if;
 update public.business_invites set status='accepted',accepted_at=clock_timestamp(),accepted_user_id=actor
 where id=invitation.id;
 insert into public.business_audit_logs(business_id,actor_user_id,action,metadata)
 values(invitation.business_id,actor,'team.invite_accepted',jsonb_build_object('inviteId',invitation.id,'role',membership.role));
 return jsonb_build_object('ok',true,'businessId',invitation.business_id,'role',membership.role);
end $$;
revoke all on function private.accept_business_invite(text) from public,anon;
grant execute on function private.accept_business_invite(text) to authenticated;
create or replace function public.accept_business_invite(p_token text)
returns jsonb language sql security invoker set search_path='' as $$ select private.accept_business_invite(p_token); $$;
revoke all on function public.accept_business_invite(text) from public,anon;
grant execute on function public.accept_business_invite(text) to authenticated;
notify pgrst,'reload schema';
