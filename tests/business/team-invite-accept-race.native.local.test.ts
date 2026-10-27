/**
 * Reproduces a real race against a real independent PostgreSQL backend
 * session (not PGlite, which is single-connection and cannot race):
 * acceptBusinessInvite (lib/business/team-invites.ts) does a plain
 * SELECT-then-INSERT into business_members, not one atomic transaction.
 * Two near-simultaneous accept calls for the same brand-new invite (no
 * existing membership row yet) can both read "no existing member" and both
 * attempt the INSERT branch. business_members already has a real
 * `unique (business_id, user_id)` constraint (005_kebu_id_draft_business.sql)
 * that correctly rejects the second insert with 23505 — this proves that
 * constraint holds under a genuine race. Separately,
 * team-invite-accept-idempotency.test.ts proves acceptBusinessInvite's own
 * catch logic now treats that 23505 as the already-a-member success case,
 * matching the established codebase convention (lib/afrique-id/
 * ensure-afrique-id.ts, lib/kebu-id/create-registration.ts, several
 * app/api/mail/* routes) instead of surfacing a raw 500.
 */
import { randomUUID } from "node:crypto";
// @ts-expect-error pg is installed without an @types/pg project dependency
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertLocalPublishDatabase } from "../creative-core/publish-db-setup";
import { dropNativeFixtureDatabase } from "../creative-core/native-postgres-cleanup";

type Connection = { query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; release: () => void };
type DbPool = { query: Connection["query"]; connect: () => Promise<Connection>; end: () => Promise<void> };

const url = process.env.KEBU_PUBLISH_CONCURRENCY_DATABASE_URL;
const database = "_kebutest_teaminvite_" + randomUUID().replaceAll("-", "");
let admin: DbPool | undefined;
let pool: DbPool | undefined;
let created = false;

const settle = <T>(promise: Promise<T>) =>
  promise.then((value) => ({ ok: true as const, value }), (error) => ({ ok: false as const, error }));

describe.skipIf(!url)("business_members — unique (business_id, user_id) under real concurrent accept", () => {
  beforeAll(async () => {
    const source = assertLocalPublishDatabase(url!);
    admin = new Pool({ connectionString: source.href, max: 1 }) as DbPool;
    await admin.query('create database "' + database + '"');
    created = true;
    source.pathname = "/" + database;
    pool = new Pool({ connectionString: source.href, max: 6 }) as DbPool;
    const c = await pool.connect();
    try {
      await c.query(`
        create extension if not exists pgcrypto;
        create schema auth;
        create table auth.users(id uuid primary key default gen_random_uuid());
        create table public.businesses(id uuid primary key default gen_random_uuid());
        create table public.business_members(
          id uuid primary key default gen_random_uuid(),
          business_id uuid not null references public.businesses(id) on delete cascade,
          user_id uuid not null references auth.users(id) on delete cascade,
          role text not null,
          status text not null default 'active',
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (business_id, user_id)
        );
      `);
    } finally {
      c.release();
    }
  }, 60000);

  afterAll(async () => {
    try {
      if (pool) await pool.end();
    } finally {
      try {
        if (created) await dropNativeFixtureDatabase(admin!, database);
      } finally {
        if (admin) await admin.end();
      }
    }
  });

  it("reproduces the race: two concurrent membership inserts for the same (business, user) — exactly one survives with 23505", async () => {
    const holder = await pool!.connect();
    const a = await pool!.connect();
    const b = await pool!.connect();
    try {
      const businessId = (await holder.query<{ id: string }>("insert into public.businesses default values returning id")).rows[0]!.id;
      const userId = (await holder.query<{ id: string }>("insert into auth.users default values returning id")).rows[0]!.id;

      const insertMember = (c: Connection) =>
        c.query("insert into public.business_members(business_id,user_id,role,status) values($1,$2,'employee','active')", [
          businessId,
          userId,
        ]);

      // Real overlap: both statements issued before either completes — exactly
      // what two near-simultaneous accept-invite requests for a brand-new
      // membership produce.
      const [first, second] = await Promise.all([settle(insertMember(a)), settle(insertMember(b))]);
      const outcomes = [first, second];

      expect(outcomes.filter((r) => r.ok)).toHaveLength(1);
      const failure = outcomes.find((r) => !r.ok) as { ok: false; error: { code?: string } } | undefined;
      expect(failure?.error.code).toBe("23505"); // unique_violation — not a generic/ambiguous failure

      const count = (
        await holder.query<{ count: number }>(
          "select count(*)::int as count from public.business_members where business_id=$1 and user_id=$2",
          [businessId, userId],
        )
      ).rows[0]!.count;
      expect(count).toBe(1);
    } finally {
      a.release();
      b.release();
      holder.release();
    }
  }, 30000);
});
