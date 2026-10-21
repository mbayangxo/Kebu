/**
 * Real-SQL verification of the Creative Assets Marketplace buyer checkout
 * (20261021010000_creative_asset_buyer_checkout.sql), the aesthetics/
 * template marketplace's canonical porting + security fix
 * (20261021020000_aesthetics_marketplace_canonical.sql), and the
 * multi-provider Kebu Checkout column rename (20261021030000), all applied
 * verbatim against PGlite — not reimplemented.
 *
 * Confirms, for both creative_asset_library and aesthetic_library: a buyer
 * can insert their own pending purchase, but cannot self-grant ownership by
 * updating their own pending row's status to 'owned' directly (the real
 * vulnerability found while building this: the archived aesthetic_library
 * policy's WITH CHECK only verified owner_id, with no status restriction —
 * reproduced below before confirming the canonical migration's fix closes
 * it), and only service_role (the Joko webhook) can actually mark a
 * purchase owned.
 */
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

describe.skipIf(!root)("Creative Asset Marketplace buyer checkout (real SQL)", () => {
  it("lets a buyer start a paid purchase but blocks self-granting ownership; only service_role can mark it owned", { timeout: 20000 }, async () => {
    const db = await openDb();
    try {
      await asUser(db, devA, "insert into developer_profiles(user_id, display_name, status, reviewed_at, payout_method, payout_phone, payout_account_name) values ($1,'Dev A','approved',now(),'wave','+221700000000','Dev A')", [devA]);
      const devAId = (await asUser(db, devA, "select id from developer_profiles where user_id=$1", [devA])).rows[0]!.id as string;
      const asset = await asUser(
        db,
        devA,
        "insert into marketplace_creative_assets(developer_id, slug, kind, name, file_url, price_cents, status) values ($1,'paid-photo','photo','Paid photo','https://files.example/p.jpg',2000,'published') returning id",
        [devAId],
      );
      const assetId = asset.rows[0]!.id as string;

      const pending = await asUser(
        db,
        buyer,
        "insert into creative_asset_library(owner_id, asset_id, status, amount_cents, provider, provider_reference) values ($1,$2,'pending',2000,'joko','kebu-ca-ref-1') returning id",
        [buyer, assetId],
      );
      expect(pending.rows.length).toBe(1);
      const libraryId = pending.rows[0]!.id as string;

      // The checkout flow's own bookkeeping update (payment id) must still work —
      // it doesn't touch status, so it isn't blocked by the new restriction.
      await asUser(db, buyer, "update creative_asset_library set provider_payment_id='pay_123' where id=$1", [libraryId]);
      const afterBookkeeping = await asUser(db, buyer, "select status, provider_payment_id from creative_asset_library where id=$1", [libraryId]);
      expect(afterBookkeeping.rows[0]).toMatchObject({ status: "pending", provider_payment_id: "pay_123" });

      // Reproduce the exploit this closes: a buyer tries to self-grant ownership
      // without ever paying, by updating their own pending row directly.
      await expect(
        asUser(db, buyer, "update creative_asset_library set status='owned' where id=$1", [libraryId]),
      ).rejects.toThrow();
      const stillPending = await asUser(db, buyer, "select status from creative_asset_library where id=$1", [libraryId]);
      expect(stillPending.rows[0]!.status).toBe("pending");

      // Only service_role (the Joko webhook) can actually mark it owned.
      await asService(db, "update creative_asset_library set status='owned', provider_payment_id='pay_123' where id=$1", [libraryId]);
      const nowOwned = await asUser(db, buyer, "select status from creative_asset_library where id=$1", [libraryId]);
      expect(nowOwned.rows[0]!.status).toBe("owned");

      // A free asset is still insertable directly as 'owned' — no payment step needed.
      const freeAsset = await asUser(
        db,
        devA,
        "insert into marketplace_creative_assets(developer_id, slug, kind, name, file_url, price_cents, status) values ($1,'free-photo','photo','Free photo','https://files.example/f.jpg',0,'published') returning id",
        [devAId],
      );
      const freeInsert = await asUser(
        db,
        buyer,
        "insert into creative_asset_library(owner_id, asset_id, status) values ($1,$2,'owned') returning id",
        [buyer, freeAsset.rows[0]!.id],
      );
      expect(freeInsert.rows.length).toBe(1);
    } finally {
      await db.close();
    }
  });

  it("reproduces the original aesthetic_library self-grant vulnerability under the archived policy, then confirms the canonical migration's fix closes it", { timeout: 20000 }, async () => {
    const db = await openDb();
    try {
      await asUser(db, devA, "insert into developer_profiles(user_id, display_name, status, reviewed_at) values ($1,'Dev A','approved',now())", [devA]);
      const devAId = (await asUser(db, devA, "select id from developer_profiles where user_id=$1", [devA])).rows[0]!.id as string;
      const tpl = await asUser(
        db,
        devA,
        "insert into marketplace_templates(developer_id, slug, name, price_cents, definition, status) values ($1,'paid-theme','Paid theme',500,'{}'::jsonb,'published') returning id",
        [devAId],
      );
      const templateId = tpl.rows[0]!.id as string;

      const pending = await asUser(
        db,
        buyer,
        "insert into aesthetic_library(owner_id, kind, marketplace_id, name, definition, status, amount_usd_cents, provider, provider_reference) values ($1,'marketplace',$2,'Paid theme','{}'::jsonb,'pending',500,'joko','kebu-mp-ref-1') returning id",
        [buyer, templateId],
      );
      const libraryId = pending.rows[0]!.id as string;

      // Reproduce the real, originally-shipped vulnerability: apply the exact
      // archived policy (supabase/migrations_archive/legacy/040_aesthetics_marketplace.sql),
      // which only checks owner_id — self-grant succeeds.
      await db.exec(`
        reset role;
        drop policy if exists "Owners update aesthetic library" on public.aesthetic_library;
        create policy "Owners update aesthetic library"
          on public.aesthetic_library for update
          using (owner_id = auth.uid())
          with check (owner_id = auth.uid());
      `);
      await asUser(db, buyer, "update aesthetic_library set status='owned' where id=$1", [libraryId]);
      const exploited = await asUser(db, buyer, "select status from aesthetic_library where id=$1", [libraryId]);
      expect(exploited.rows[0]!.status).toBe("owned");

      // Reset to pending and re-apply the canonical migration's actual fixed policy.
      await asService(db, "update aesthetic_library set status='pending' where id=$1", [libraryId]);
      await db.exec("reset role;");
      await db.exec(readFileSync(resolve("supabase/migrations/20261021020000_aesthetics_marketplace_canonical.sql"), "utf8"));

      await expect(
        asUser(db, buyer, "update aesthetic_library set status='owned' where id=$1", [libraryId]),
      ).rejects.toThrow();
      const stillPending = await asUser(db, buyer, "select status from aesthetic_library where id=$1", [libraryId]);
      expect(stillPending.rows[0]!.status).toBe("pending");

      await asService(db, "update aesthetic_library set status='owned', provider_payment_id='pay_456' where id=$1", [libraryId]);
      const nowOwned = await asUser(db, buyer, "select status from aesthetic_library where id=$1", [libraryId]);
      expect(nowOwned.rows[0]!.status).toBe("owned");
    } finally {
      await db.close();
    }
  });

  it("records which real provider paid a marketplace purchase, not just Joko", { timeout: 20000 }, async () => {
    const db = await openDb();
    try {
      await asUser(db, devA, "insert into developer_profiles(user_id, display_name, status, reviewed_at, payout_method, payout_phone, payout_account_name) values ($1,'Dev A','approved',now(),'wave','+221700000000','Dev A')", [devA]);
      const devAId = (await asUser(db, devA, "select id from developer_profiles where user_id=$1", [devA])).rows[0]!.id as string;
      const asset = await asUser(
        db,
        devA,
        "insert into marketplace_creative_assets(developer_id, slug, kind, name, file_url, price_cents, status) values ($1,'wave-photo','photo','Wave photo','https://files.example/w.jpg',1500,'published') returning id",
        [devAId],
      );
      const assetId = asset.rows[0]!.id as string;

      const pending = await asUser(
        db,
        buyer,
        "insert into creative_asset_library(owner_id, asset_id, status, amount_cents, provider, provider_reference) values ($1,$2,'pending',1500,'wave','kebu-ca-wave-ref-1') returning id",
        [buyer, assetId],
      );
      const libraryId = pending.rows[0]!.id as string;

      await asService(db, "update creative_asset_library set status='owned', provider_payment_id='wave_pay_1' where id=$1", [libraryId]);
      const owned = await asUser(db, buyer, "select status, provider, provider_payment_id from creative_asset_library where id=$1", [libraryId]);
      expect(owned.rows[0]).toMatchObject({ status: "owned", provider: "wave", provider_payment_id: "wave_pay_1" });
    } finally {
      await db.close();
    }
  });
});
