import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type PublishSqlExecutor = { exec: (sql: string) => Promise<unknown> };

/** Actual migration chain shared by single-session and multi-connection tests. */
export async function setupPublishDatabase(db: PublishSqlExecutor) {
 await db.exec(`create extension if not exists pgcrypto;
 create schema auth; create table auth.users(id uuid primary key,email text,created_at timestamptz default now());
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.role() returns text language sql stable as $$select coalesce(current_setting('request.jwt.claim.role',true),'anon')$$;
 do $$begin
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
 end$$;
 alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
 alter default privileges in schema public grant all on routines to authenticated,anon,service_role;
 alter default privileges in schema public grant all on sequences to authenticated,anon,service_role;
 grant usage on schema public,auth to authenticated,anon,service_role;
 grant execute on all functions in schema auth to authenticated,anon,service_role;`);
 for(const file of ["004_create_projects.sql","008_website_builder.sql","011_maylecor_section_types.sql","096_add_stats_section_type.sql","013_site_seo_settings.sql","022_site_products_and_create_designs.sql","065_site_chrome.sql","20260924040000_page_device_layouts.sql","20260924010000_builder_atomic_rpcs.sql","20260925012420_revoke_anon_builder_rpcs.sql","20260930010000_kcd_document_storage.sql","20261002033337_kcd_responsive_state_ops.sql","20261003023326_kcd_page_lifecycle_ops.sql","20261005065838_kcd_transactional_publish.sql","20261007021245_kcd_spatial_overrides.sql","20261008003826_kcd_constraints_transforms.sql","20261008010612_kcd_nested_device_order.sql","20261008033608_kcd_responsive_art_direction.sql","20261008063959_kcd_native_motion_engine.sql","20261008085728_kcd_motion_publishing.sql","20261008184700_kcd_native_visual_effects.sql","20261008185133_kcd_native_rich_text.sql","20261008185757_kcd_native_video.sql","20261008190325_kcd_editorial_composition.sql","20261020202513_kcd_collage_responsive_presentation.sql","20261021024451_kcd_collage_social_rail_responsive.sql"]){
  if(file.startsWith("008"))await db.exec("create table public.businesses(id uuid primary key default gen_random_uuid())");
  await db.exec(readFileSync(resolve(/^\d{3}_/.test(file) ? "supabase/migrations_archive/legacy" : "supabase/migrations",file),"utf8"));
 }
}

/** Only an explicit loopback admin URL can create a disposable test database. */
export function assertLocalPublishDatabase(value: string) {
 const url=new URL(value);
 if(!["postgres:","postgresql:"].includes(url.protocol)||!["localhost","127.0.0.1","[::1]"].includes(url.hostname)||url.search||!url.pathname||url.pathname==="/")throw new Error("Publish concurrency tests require a loopback PostgreSQL URL without query overrides");
 return url;
}
