/**
 * Run with `npx tsx scripts/verify-search-local-ui.mjs` (not plain `node`):
 * it imports tests/search/db/local-pg.ts directly, which plain node cannot
 * load. Requires a reachable local Postgres (LOCAL_PG_TEST_URL, default
 * postgres://postgres:localtest@127.0.0.1:5432/postgres).
 *
 * Real /kebu-search UI -> Next API routes -> postgrest-shim -> real migrated
 * Postgres. Runs `next build && next start`, not `next dev`: in this
 * sandbox, `next dev`'s Turbopack HMR websocket handshake fails over the
 * loopback proxy and silently blocks client hydration (no console/page
 * error surfaces it -- every onClick/onChange in the app never fires), so a
 * `next dev`-based gate here would report false negatives on a correct app.
 * A production build has no HMR socket and hydrates normally.
 */
import { spawn, execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const chromium = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH ?? "/opt/pw-browsers/chromium";

const { createSearchTestDb, dropSearchTestDb } = await import(join(root, "tests/search/db/local-pg.ts"));

const output = process.env.KEBU_SEARCH_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), "kebu-search-ui-"));
mkdirSync(output, { recursive: true });

const APP_PORT = 41918;
const SHIM_PORT = 38511;

async function seed(db) {
  const { rows } = await db.pool.query(`insert into auth.users default values returning id`);
  const userId = rows[0].id;

  await db.pool.query(
    `insert into public.businesses (id, public_kebu_id, legal_name, country_code, category, description, lifecycle_status, verification_level, created_by)
     values ('11111111-1111-4111-8111-100000000001', 'KEBU-SN-01-ABCDEF', 'Baobab Chocolate Manufacturing', 'SN', 'food', 'Artisanal chocolate maker in Dakar.', 'active', 2, $1)`,
    [userId],
  );
  await db.pool.query(
    `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, summary, trust_label, access_scope, category, country_code, fetched_at, updated_at)
     values ('business:1', 'businesses', 'business', '11111111-1111-4111-8111-100000000001', 'Baobab Chocolate Manufacturing', 'food · SN', 'verified', 'public', 'food', 'SN', now(), now())`,
  );

  await db.pool.query(
    `insert into public.projects (id, owner_id, title, status, subdomain) values ('22222222-2222-4222-8222-200000000001', $1, 'Baobab Store', 'published', 'baobab')`,
    [userId],
  );
  await db.pool.query(
    `insert into public.project_products (id, project_id, name, description, price_label, image_url, is_active)
     values ('33333333-3333-4333-8333-300000000001', '22222222-2222-4222-8222-200000000001', 'Chocolate Bar', 'Dark chocolate bar', '2000 XOF', 'https://example.com/choc.jpg', true)`,
  );
  await db.pool.query(
    `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, summary, trust_label, access_scope, fetched_at, updated_at)
     values ('product:1', 'products', 'shop_product', '33333333-3333-4333-8333-300000000001', 'Chocolate Bar', 'Dark chocolate bar · Baobab Store', 'published', 'public', now(), now())`,
  );

  await db.pool.query(
    `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, summary, trust_label, source_url, source_name, access_scope, fetched_at, updated_at)
     values ('sites:1', 'sites', 'store', '22222222-2222-4222-8222-200000000001', 'Baobab Store', 'Published Kebu store', 'published', 'https://baobab.thekebu.com', 'Kebu Sites', 'public', now(), now())`,
  );

  await db.pool.query(
    `insert into public.developer_profiles (id, user_id, display_name, bio, website_url, status)
     values ('44444444-4444-4444-8444-400000000001', $1, 'Amina Developer', 'I build Kebu templates.', 'https://amina.dev', 'approved')`,
    [userId],
  );
  await db.pool.query(
    `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, summary, trust_label, access_scope, fetched_at, updated_at)
     values ('people:1', 'people', 'people', '44444444-4444-4444-8444-400000000001', 'Amina Developer', 'I build Kebu templates.', 'published', 'public', now(), now())`,
  );

  await db.pool.query(
    `insert into public.country_profiles (country, country_code, capital, economy_overview, cultural_notes, startup_ecosystem, publish_status, data_confidence)
     values ('Senegal', 'SN', 'Dakar', 'Services and trade dominate urban activity.', 'Senegal is known for Teranga hospitality.', 'Dakar tech hubs include CTIC Dakar.', 'published', 'high')`,
  );
  for (const mode of ["research", "trade", "culture"]) {
    await db.pool.query(
      `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, summary, trust_label, access_scope, fetched_at, updated_at)
       values ($1, $2, 'country', 'SN', 'Senegal', 'Country intelligence', 'published', 'public', now(), now())`,
      [`${mode}:SN`, mode],
    );
  }
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((done) => {
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    child.once("close", () => { clearTimeout(timer); done(); });
    child.kill();
  });
}

const db = await createSearchTestDb();
let shim, server, tests;
try {
  await seed(db);

  shim = spawn(process.execPath, [join(root, "tests/search/db/postgrest-shim.mjs"), db.pool.options.connectionString, String(SHIM_PORT)], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error("Shim startup timeout")), 10000);
    shim.stdout.on("data", (bytes) => { if (bytes.toString().includes("listening")) { clearTimeout(timer); done(); } });
    shim.on("exit", (code) => fail(new Error("Shim exit " + code)));
  });

  const buildEnv = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${SHIM_PORT}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  };
  await execFileAsync(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "build"], { cwd: root, env: buildEnv, maxBuffer: 64 * 1024 * 1024 });

  server = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "start", "--port", String(APP_PORT)], {
    cwd: root,
    env: buildEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error("Server startup timeout")), 30000);
    server.stdout.on("data", (bytes) => { if (bytes.toString().includes("Ready")) { clearTimeout(timer); done(); } });
    server.on("exit", (code) => fail(new Error("Server exit " + code)));
  });

  const config = join(mkdtempSync(join(tmpdir(), "kebu-search-config-")), "playwright.config.mjs");
  writeFileSync(
    config,
    `import{defineConfig}from${JSON.stringify(join(root, "node_modules/playwright/test.mjs"))};export default defineConfig({testDir:${JSON.stringify(join(root, "tests/search"))},testMatch:'discovery-journey.local.spec.ts',workers:1,retries:0,maxFailures:1,timeout:30000,reporter:[['list'],['json',{outputFile:${JSON.stringify(join(output, "results.json"))}}]],outputDir:${JSON.stringify(join(output, "traces"))},use:{actionTimeout:8000,baseURL:${JSON.stringify(`http://localhost:${APP_PORT}`)},viewport:{width:1440,height:1000},launchOptions:{executablePath:${JSON.stringify(chromium)},args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']}}});`,
  );

  tests = spawn(process.execPath, [join(root, "node_modules/playwright/cli.js"), "test", "--config", config], {
    cwd: root,
    env: { ...buildEnv, KEBU_SEARCH_SHIM_URL: `http://127.0.0.1:${SHIM_PORT}` },
    stdio: "inherit",
  });
  const code = await new Promise((done) => tests.on("exit", done));
  const report = JSON.parse(readFileSync(join(output, "results.json"), "utf8"));
  writeFileSync(join(output, "verification.json"), JSON.stringify(report.stats, null, 2));
  console.log("SEARCH_UI_RESULT", JSON.stringify(report.stats));
  if (code !== 0 || report.stats.unexpected || report.stats.skipped) throw new Error("Search discovery-journey browser gate failed");
} finally {
  await stopChild(tests);
  await stopChild(server);
  await stopChild(shim);
  await dropSearchTestDb(db);
}
