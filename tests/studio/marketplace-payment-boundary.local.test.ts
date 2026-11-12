/** Actual canonical migration SQL: paid ownership is server-authorized, never buyer manufactured. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const buyer = "11111111-1111-4111-8111-111111111111";
const devA = "22222222-2222-4222-8222-222222222222";

async function openDb(): Promise<Db> {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
  const db: Db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create extension if not exists pgcrypto;
    create schema auth;
    create table auth.users(id uuid primary key, email text, created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    do $$begin
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
    end$$;
    alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
    grant usage on schema public, auth to authenticated, anon, service_role;
    grant execute on all functions in schema auth to authenticated, anon, service_role;
    create or replace function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at = now(); return new; end$$;
    insert into auth.users(id) values ('${buyer}'), ('${devA}');
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20261020030000_studio_creative_assets_marketplace.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261020040000_developer_payout_settings.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261021010000_creative_asset_buyer_checkout.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261021020000_aesthetics_marketplace_canonical.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261021030000_kebu_checkout_multi_provider.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261021030002_marketplace_paid_ownership_boundary.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}
async function asService(db: Db, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set role service_role;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("Marketplace paid ownership boundary (real canonical SQL)", () => {
  it.each(["creative_asset", "aesthetic"])("rejects buyer self-grant via paid %s INSERT", { timeout: 20000 }, async kind => {
    const db = await openDb();
    try {
      await asUser(db, devA, "insert into developer_profiles(user_id,display_name,status,reviewed_at,payout_method,payout_phone,payout_account_name) values ($1,'Dev A','approved',now(),'wave','+221700000000','Dev A')", [devA]);
      const developer = (await asUser(db, devA, "select id from developer_profiles where user_id=$1", [devA])).rows[0]!.id;
      if (kind === "creative_asset") {
        const asset = (await asUser(db, devA, "insert into marketplace_creative_assets(developer_id,slug,kind,name,file_url,price_cents,status) values($1,'boundary-paid','photo','Paid asset','https://files.example/paid.jpg',2000,'published') returning id", [developer])).rows[0]!.id;
        await expect(asUser(db, buyer, "insert into creative_asset_library(owner_id,asset_id,status) values($1,$2,'owned') returning id", [buyer,asset])).rejects.toThrow();
      } else {
        const asset = (await asUser(db, devA, "insert into marketplace_templates(developer_id,slug,name,price_cents,definition,status) values($1,'boundary-paid','Paid template',500,'{}','published') returning id", [developer])).rows[0]!.id;
        await expect(asUser(db, buyer, "insert into aesthetic_library(owner_id,kind,marketplace_id,name,definition,status) values($1,'marketplace',$2,'Paid template','{}','owned') returning id", [buyer,asset])).rejects.toThrow();
      }
    } finally { await db.close(); }
  });
  it("allows trusted paid initiation and ownership while rejecting buyer reference/price/status mutation", { timeout: 20000 }, async () => {
    const db = await openDb();
    try {
      await asUser(db, devA, "insert into developer_profiles(user_id,display_name,status,reviewed_at,payout_method,payout_phone,payout_account_name) values($1,'Dev A','approved',now(),'wave','+221700000000','Dev A')", [devA]);
      const developer = (await asUser(db, devA, "select id from developer_profiles where user_id=$1", [devA])).rows[0]!.id;
      const asset = (await asUser(db, devA, "insert into marketplace_creative_assets(developer_id,slug,kind,name,file_url,price_cents,status) values($1,'paid-secure','photo','Paid asset','https://files.example/paid.jpg',2000,'published') returning id", [developer])).rows[0]!.id;
      await expect(asUser(db, buyer, "insert into creative_asset_library(owner_id,asset_id,status,amount_cents,provider_reference,provider) values($1,$2,'pending',1,'stolen-ref','wave')", [buyer,asset])).rejects.toThrow();
      const receipt = (await asService(db, "insert into creative_asset_library(owner_id,asset_id,status,amount_cents,provider_reference,provider) values($1,$2,'pending',2000,'trusted-unique-ref','wave') returning id", [buyer,asset])).rows[0]!.id;
      for (const assignment of ["status='owned'", "status='failed'", "amount_cents=1", "provider_reference='stolen-ref'", "provider='joko'", "provider_payment_id='fake'", "asset_id=null"]) {
        await expect(asUser(db, buyer, `update creative_asset_library set ${assignment} where id=$1`, [receipt])).rejects.toThrow();
      }
      const pending = (await asUser(db, buyer, "select status,amount_cents,provider_reference from creative_asset_library where id=$1", [receipt])).rows[0]!;
      expect(pending).toMatchObject({ status: "pending", amount_cents: 2000, provider_reference: "trusted-unique-ref" });
      await asService(db, "update creative_asset_library set status='owned',provider_payment_id='verified-payment' where id=$1", [receipt]);
      expect((await asUser(db, buyer, "select status from creative_asset_library where id=$1", [receipt])).rows[0]!.status).toBe("owned");
      expect((await asUser(db, devA, "select id from creative_asset_library where id=$1", [receipt])).rows).toHaveLength(0);
    } finally { await db.close(); }
  });
  it("preserves genuine free published asset acquisition and private upload acquisition", { timeout: 20000 }, async () => {
    const db = await openDb();
    try {
      await asUser(db, devA, "insert into developer_profiles(user_id,display_name,status,reviewed_at) values($1,'Dev A','approved',now())", [devA]);
      const developer = (await asUser(db, devA, "select id from developer_profiles where user_id=$1", [devA])).rows[0]!.id;
      const asset = (await asUser(db, devA, "insert into marketplace_creative_assets(developer_id,slug,kind,name,file_url,price_cents,status) values($1,'free-secure','photo','Free asset','https://files.example/free.jpg',0,'published') returning id", [developer])).rows[0]!.id;
      await expect(asUser(db, buyer, "insert into creative_asset_library(owner_id,asset_id,status) values($1,$2,'owned')", [devA,asset])).rejects.toThrow();
      const free = await asUser(db, buyer, "insert into creative_asset_library(owner_id,asset_id,status) values($1,$2,'owned') returning id", [buyer,asset]);
      expect(free.rows).toHaveLength(1);
      const upload = await asUser(db, buyer, "insert into aesthetic_library(owner_id,kind,name,definition,status) values($1,'upload','My design','{}','owned') returning id", [buyer]);
      expect(upload.rows).toHaveLength(1);
      await expect(asUser(db, buyer, "update aesthetic_library set kind='catalog',catalog_slug='paid-template' where id=$1", [upload.rows[0]!.id])).rejects.toThrow();
    } finally { await db.close(); }
  });
  it("rejects buyer-created catalog receipts and aesthetic pending references while allowing trusted records", { timeout: 20000 }, async () => {
    const db = await openDb();
    try {
      await expect(asUser(db, buyer, "insert into aesthetic_library(owner_id,kind,catalog_slug,name,definition,status) values($1,'catalog','paid-template','Paid template','{}','owned')", [buyer])).rejects.toThrow();
      await expect(asUser(db, buyer, "insert into aesthetic_library(owner_id,kind,catalog_slug,name,definition,status,provider_reference,provider) values($1,'catalog','paid-template','Paid template','{}','pending','stolen-ref','joko')", [buyer])).rejects.toThrow();
      const receipt = (await asService(db, "insert into aesthetic_library(owner_id,kind,catalog_slug,name,definition,status,amount_usd_cents,provider_reference,provider) values($1,'catalog','paid-template','Paid template','{}','pending',500,'trusted-aesthetic-ref','joko') returning id", [buyer])).rows[0]!.id;
      await expect(asUser(db, buyer, "update aesthetic_library set amount_usd_cents=1,provider_reference='stolen-ref' where id=$1", [receipt])).rejects.toThrow();
      expect((await asUser(db, buyer, "select amount_usd_cents from aesthetic_library where id=$1", [receipt])).rows[0]!.amount_usd_cents).toBe(500);
      await asService(db, "update aesthetic_library set status='owned' where id=$1", [receipt]);
      expect((await asUser(db, buyer, "select status from aesthetic_library where id=$1", [receipt])).rows[0]!.status).toBe("owned");
    } finally { await db.close(); }
  });

});
