/** Real Maps UI -> Next API -> real open-provider network (tiles.openfreemap.org,
 * nominatim.openstreetmap.org, router.project-osrm.org) and -> Next's own
 * /api/public/maps/businesses route, served by a loopback Auth/REST fixture
 * for the one Supabase dependency that route has (reading `deployments`).
 * No migration was added for Maps (see lib/maps/business-pins.ts), so there
 * is no RLS surface to prove here with PGlite — the real third-party
 * network calls are the thing this script exists to verify for real. */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, createWriteStream, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const chromium = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH ?? '/opt/pw-browsers/chromium';

const userId = '66666666-6666-4666-8666-666666666666';
const serviceKey = 'fixture-service-role-key';
const output = process.env.KEBU_MAPS_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), 'kebu-maps-ui-'));
mkdirSync(output, { recursive: true });

// A real, schema-shaped published-site snapshot with a genuine "Find us" map
// section — the same data a real business owner would have entered in the
// site builder (lib/create/website-schema.ts's `map` section props).
const seededDeployment = {
  project_id: '77777777-7777-4777-8777-777777777777',
  subdomain: 'awa-creative-test',
  schema_version: 'website-v1',
  content_hash: null,
  published_at: '2026-11-08T00:00:00Z',
  snapshot: {
    schemaVersion: 'website-v1',
    title: 'Awa Creative',
    theme: {},
    pages: [
      {
        slug: 'home',
        title: 'Home',
        sections: [
          {
            type: 'map',
            props: { heading: 'Find us', address: 'Plateau, Dakar', latitude: 14.6928, longitude: -17.4467, zoom: 14 },
          },
        ],
        deviceLayouts: {},
      },
    ],
  },
};

function identity(req) {
  try {
    const raw = (req.headers.authorization ?? '').split(' ')[1];
    if (raw === serviceKey) return 'service';
    const id = JSON.parse(Buffer.from(raw.split('.')[1], 'base64url').toString()).sub;
    return id === userId ? userId : null;
  } catch {
    return null;
  }
}

const backend = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:38490');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,x-client-info,content-type,prefer,accept');
  res.setHeader('Content-Type', 'application/json');
  const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:38491');
  const who = identity(req);

  if (url.pathname.startsWith('/auth/')) {
    if (!who || who === 'service') { send(401, { message: 'Fixture session missing' }); return; }
    send(200, { id: who, email: 'owner@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-11-08T00:00:00Z' });
    return;
  }
  if (url.pathname === '/rest/v1/deployments') {
    if (who !== 'service') { send(401, { code: '42501', message: 'This endpoint is service-role only in the real app.' }); return; }
    send(200, [seededDeployment]);
    return;
  }
  send(200, []);
});
await new Promise((done) => backend.listen(38491, '127.0.0.1', done));

const temp = mkdtempSync(join(tmpdir(), 'kebu-maps-config-'));
const config = join(temp, 'playwright.config.mjs');
writeFileSync(
  config,
  `import{defineConfig}from${JSON.stringify(join(root, 'node_modules/playwright/test.mjs'))};export default defineConfig({testDir:${JSON.stringify(join(root, 'tests/platform'))},testMatch:'maps-editor.local.spec.ts',workers:1,retries:0,maxFailures:1,timeout:60000,reporter:[['list'],['json',{outputFile:${JSON.stringify(join(output, 'results.json'))}}]],outputDir:${JSON.stringify(join(output, 'traces'))},use:{actionTimeout:20000,baseURL:'http://127.0.0.1:38490',viewport:{width:1280,height:900},screenshot:'only-on-failure',launchOptions:{executablePath:${JSON.stringify(chromium)},args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']}}});`,
);

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:38491',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-local-fixture',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  SUPABASE_SECRET_KEY: '',
  SUPABASE_URL: '',
  DATABASE_URL: '',
  ANTHROPIC_API_KEY: '',
  VERCEL_ENV: '',
  KEBU_MAPS_USER_ID: userId,
};
rmSync(join(root, '.next/dev'), { recursive: true, force: true });

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((done) => {
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('close', () => { clearTimeout(timer); done(); });
    child.kill();
  });
}

let server, tests;
try {
  const log = createWriteStream(join(output, 'server.log'));
  server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '38490'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.pipe(log); server.stderr.pipe(log);
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(Error('Startup timeout')), 60000);
    server.stdout.on('data', (bytes) => { if (bytes.toString().includes('Ready')) { clearTimeout(timer); done(); } });
    server.on('exit', (code) => fail(Error('Server exit ' + code)));
  });
  tests = spawn(process.execPath, [join(root, 'node_modules/playwright/cli.js'), 'test', '--config', config], { cwd: root, env, stdio: 'inherit' });
  const code = await new Promise((done) => tests.on('exit', done));
  const report = JSON.parse(readFileSync(join(output, 'results.json'), 'utf8'));
  const receipt = { ...report.stats };
  writeFileSync(join(output, 'verification.json'), JSON.stringify(receipt, null, 2));
  console.log('MAPS_UI_RESULT', JSON.stringify(receipt));
  if (code !== 0 || report.stats.unexpected || report.stats.skipped) throw Error('Maps browser gate failed');
} finally {
  await stopChild(tests);
  await stopChild(server);
  await new Promise((done) => backend.close(done));
  rmSync(temp, { recursive: true, force: true });
}
