type FixtureAdmin = { query: (sql: string, args?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

/** pool.end() can resolve before the server observes the last socket close. */
export async function dropNativeFixtureDatabase(admin: FixtureAdmin, database: string) {
  if (!/^_kebutest_(?:publish|experience|payments|teaminvite)_[a-f\d]{32}$/.test(database)) {
    throw Error("Refusing to drop a database outside the generated native fixture namespace.");
  }
  const deadline = Date.now() + 5000;
  while (true) {
    const result = await admin.query("select count(*)::int as total from pg_stat_activity where datname=$1", [database]);
    if (result.rows[0].total === 0) break;
    if (Date.now() >= deadline) throw Error("Disposable native database still has connections; refusing forced teardown.");
    await new Promise(done => setTimeout(done, 25));
  }
  // All pools are already ended. Never terminate an active backend to make a
  // test look cleaned up; unexpected surviving sessions must fail the gate.
  await admin.query(`drop database "${database}"`);
}
