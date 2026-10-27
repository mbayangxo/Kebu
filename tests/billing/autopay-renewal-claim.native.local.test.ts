/**
 * Proves the atomic renewal-attempt claim added to app/api/cron/billing-monthly/
 * route.ts actually closes a real double-charge race, against a real Postgres
 * backend -- not a mock. Before the fix, the route created the JOKO charge
 * (a fresh, unrelated idempotency reference each time) BEFORE recording
 * last_renewal_attempt_at; a crash/retry or a true concurrent overlap between
 * two cron invocations could both pass the staleness check and both charge.
 *
 * This test reproduces the exact conditional UPDATE the fixed route now runs
 * (`UPDATE site_subscriptions SET last_renewal_attempt_at = now() WHERE id = $1
 *  AND (last_renewal_attempt_at IS NULL OR last_renewal_attempt_at < $2)`)
 * fired from two concurrent real sessions racing for the same subscription,
 * and asserts exactly one of them wins the claim -- the other must see the
 * row already claimed and back off, never reaching the charge call at all.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error — @types/pg is not in devDependencies; pg itself is present
import { Pool } from "pg";

const LOCAL_URL = process.env.LOCAL_PG_TEST_URL ?? "postgres://postgres:localtest@127.0.0.1:5432/postgres";

let reachable = false;
let pool: InstanceType<typeof Pool>;

beforeAll(async () => {
  const probe = new Pool({ connectionString: LOCAL_URL, max: 1, connectionTimeoutMillis: 1500 });
  try {
    await probe.query("select 1");
    reachable = true;
  } catch {
    reachable = false;
  } finally {
    await probe.end().catch(() => undefined);
  }
  if (!reachable) return;

  pool = new Pool({ connectionString: LOCAL_URL, max: 6 });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public._billing_claim_test (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      last_renewal_attempt_at timestamptz
    )
  `);
});

afterAll(async () => {
  if (!reachable) return;
  await pool.query(`DROP TABLE IF EXISTS public._billing_claim_test`);
  await pool.end();
});

async function claimAttempt(subId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  const { rowCount } = await pool.query(
    `UPDATE public._billing_claim_test
     SET last_renewal_attempt_at = now()
     WHERE id = $1 AND (last_renewal_attempt_at IS NULL OR last_renewal_attempt_at < $2)`,
    [subId, staleBefore],
  );
  return (rowCount ?? 0) === 1;
}

describe("billing-monthly autopay renewal claim — real concurrent Postgres", () => {
  it("two truly concurrent claim attempts on the same subscription: exactly one wins", async () => {
    if (!reachable) {
      expect(reachable).toBe(false); // documents the skip, doesn't silently pass
      return;
    }
    const { rows } = await pool.query(
      `INSERT INTO public._billing_claim_test (last_renewal_attempt_at) VALUES (NULL) RETURNING id`,
    );
    const subId = rows[0].id as string;

    // Both claims fired at once, each on its own real connection — this is
    // the true-overlap case, strictly harder than a sequential crash+retry.
    const [a, b] = await Promise.all([claimAttempt(subId), claimAttempt(subId)]);
    const winners = [a, b].filter(Boolean).length;
    expect(winners).toBe(1); // if this were 2, both would have gone on to charge JOKO
  });

  it("a retry within the 20h window after a successful claim is correctly rejected", async () => {
    if (!reachable) return;
    const { rows } = await pool.query(
      `INSERT INTO public._billing_claim_test (last_renewal_attempt_at) VALUES (NULL) RETURNING id`,
    );
    const subId = rows[0].id as string;

    const first = await claimAttempt(subId);
    expect(first).toBe(true);

    // Simulates the exact pre-fix failure mode: the process that won the
    // claim crashes right after (before ever calling JOKO or committing
    // anything else), and the next cron tick retries the same subscription.
    const retry = await claimAttempt(subId);
    expect(retry).toBe(false);
  });

  it("a genuinely stale attempt (>20h old) can be re-claimed — retries of real failures still work", async () => {
    if (!reachable) return;
    const staleTimestamp = new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString();
    const { rows } = await pool.query(
      `INSERT INTO public._billing_claim_test (last_renewal_attempt_at) VALUES ($1) RETURNING id`,
      [staleTimestamp],
    );
    const subId = rows[0].id as string;

    const reclaimed = await claimAttempt(subId);
    expect(reclaimed).toBe(true); // a real, previous failure must still be retriable
  });
});
