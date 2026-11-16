import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export const companyIds = {
  owner: "10000000-0000-4000-8000-000000000001",
  worker: "10000000-0000-4000-8000-000000000002",
  other: "10000000-0000-4000-8000-000000000003",
  finance: "10000000-0000-4000-8000-000000000004",
  business: "10000000-0000-4000-8000-000000000005",
  second: "10000000-0000-4000-8000-000000000006",
};
export async function companyDatabase() {
  const root = process.env.KEBU_LOCAL_PGLITE_ROOT!;
  const { PGlite } = await import(
    pathToFileURL(resolve(root, "dist/index.js")).href
  );
  const { pgcrypto } = await import(
    pathToFileURL(resolve(root, "dist/contrib/pgcrypto.js")).href
  );
  const db = new PGlite({ extensions: { pgcrypto } });
  const ids = companyIds,
    read = (path: string) => readFileSync(path, "utf8");
  await db.exec(`create extension pgcrypto;create schema auth;create schema private;create role anon;create role authenticated;create role service_role bypassrls;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=clock_timestamp();return new;end$$;
 create table public.businesses(id uuid primary key,legal_name text,trading_name text,public_kebu_id text,lifecycle_status text default 'active');
 create table public.user_profiles(id uuid primary key,name text,public_kebu_id text);
 create table public.business_members(id uuid primary key default gen_random_uuid(),business_id uuid references businesses(id),user_id uuid references auth.users(id),role text,status text default 'active',created_at timestamptz default clock_timestamp(),updated_at timestamptz default clock_timestamp(),unique(business_id,user_id));
 create table public.business_audit_logs(id uuid default gen_random_uuid(),business_id uuid,actor_user_id uuid,action text,metadata jsonb);
 grant usage on schema public,auth to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;grant select on businesses,business_members to authenticated;
 insert into auth.users values('${ids.owner}','owner@test.test',now()),('${ids.worker}','worker@test.test',now()),('${ids.other}','other@test.test',now()),('${ids.finance}','finance@test.test',now());
 insert into user_profiles values('${ids.owner}','Owner','KA-OWNER'),('${ids.worker}','Worker','KA-WORKER'),('${ids.other}','Other','KA-OTHER'),('${ids.finance}','Finance','KA-FINANCE');
 insert into businesses values('${ids.business}','Company A',null,'KB-A','active'),('${ids.second}','Company B',null,'KB-B','active');
 insert into business_members(business_id,user_id,role)values('${ids.business}','${ids.owner}','founder'),('${ids.business}','${ids.worker}','employee'),('${ids.business}','${ids.finance}','finance_manager'),('${ids.second}','${ids.other}','founder');
 `);
  const inviteSQL = read(
    "supabase/migrations_archive/legacy/055_team_invites_demo_orders.sql",
  );
  await db.exec(
    inviteSQL.slice(0, inviteSQL.indexOf("-- >>> Shop demo orders")),
  );
  await db.exec(read("supabase/migrations/20260920081000_workspace_items.sql"));
  await db.exec(
    "grant select,insert,update,delete on workspace_items to authenticated;",
  );
  const roomSQL = read("supabase/migrations/20260920085000_kebu_rooms.sql")
    .split(";")
    .filter((s) => !/workspace_items|space_channels|space_messages/.test(s))
    .join(";");
  await db.exec(roomSQL);
  await db.exec(
    "alter table workspace_items add column room_id uuid references rooms(id);",
  );
  const scoped = read(
    "supabase/migrations/20260920086000_room_scope_hardening.sql",
  )
    .split(";")
    .filter((s) => !/space_channels|space_messages/.test(s))
    .join(";");
  await db.exec(scoped);
  await db.exec(
    read("supabase/migrations/20261016150000_workspace_item_visibility.sql"),
  );
  await db.exec(read("supabase/migrations/20261016120000_library_sharing.sql"));
  await db.exec(read("supabase/migrations/20261108020000_room_calls_mesh.sql"));
  await db.exec(
    "alter table workspace_items add column rich_content jsonb;create schema realtime;create table realtime.messages(topic text);alter table realtime.messages enable row level security;create function realtime.topic() returns text language sql stable as $$select current_setting('request.topic',true)$$;",
  );
  await db.exec(
    read("supabase/migrations/20261112075718_document_collaboration_state.sql"),
  );
  await db.exec(
    read("supabase/migrations/20261106074222_kebu_builtin_app_installs.sql"),
  );
  await db.exec(
    read(
      "supabase/migrations/20261016190000_liguey_job_listings_applications.sql",
    ),
  );
  for (const file of [
    "20261116015115_company_team_invite_atomic.sql",
    "20261116015814_liguey_optional_app_and_employer_safety.sql",
    "20261116020225_company_worker_portal.sql",
    "20261116022036_liguey_interviews_and_reports.sql",
  ])
    await db.exec(read("supabase/migrations/" + file));
  await db.exec(
    `insert into kebu_builtin_app_installs(user_id,app_key)values('${ids.owner}','liguey'),('${ids.worker}','liguey');`,
  );
  async function actor(id: string) {
    await db.exec(
      `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
    );
  }
  async function action(
    type: string,
    data: Record<string, unknown>,
    business = ids.business,
  ) {
    const input = { id: crypto.randomUUID(), ...data };
    return (
      await db.query(
        "select public.company_portal_action($1,$2,$3) as result",
        [business, type, JSON.stringify(input)],
      )
    ).rows[0].result;
  }
  return { db, actor, action };
}
