/**
 * Real browser, two real distinct hostnames (kebu.africa / testdeploy.cloud.kebu.africa,
 * routed to 127.0.0.1 via local /etc/hosts), proving Kebu's auth cookie -- set with the
 * EXACT attribute string lib/supabase/client.ts's createBrowserClient always uses
 * (path=/, sameSite=lax, no domain) -- cannot be read or sent cross-host to a Cloud
 * deployment's serving origin. Cookie domain-scoping is a platform property of the
 * attribute string itself, identical no matter which code sets it, so this does not
 * need a full Supabase-backed login flow to be a real, conclusive test of the property.
 */
import { spawn } from 'node:child_process';
const root = new URL('..', import.meta.url).pathname;
const { chromium: pw } = await import(root + 'node_modules/playwright/index.mjs');
const { CLOUD_STATIC_CSP } = await import(root + 'lib/cloud/constants.ts');
const chromiumPath = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH;
if (!chromiumPath) throw new Error('Set KEBU_CHROMIUM_EXECUTABLE_PATH.');

const PORT = 38777;
const MAIN = `http://kebu.africa:${PORT}`;
// COMPARISON_HOST lets this same script be re-run against a different second
// origin (e.g. a Builder-site-shaped `*.kebu.africa` host) to check whether it
// gets the same real isolation result as the Cloud-deployment host, without
// duplicating the whole test.
const CLOUD = process.env.KEBU_COMPARISON_HOST
  ? `http://${process.env.KEBU_COMPARISON_HOST}:${PORT}`
  : `http://testdeploy.cloud.kebu.africa:${PORT}`;
const SECRET_COOKIE = 'sb-kebu-test-session';
const SECRET_VALUE = 'main-app-secret-session-token';

function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((done) => {
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('close', () => { clearTimeout(timer); done(); });
    child.kill();
  });
}

let server;
let browser;
const result = { steps: [] };
try {
  server = spawn(process.execPath, [root + 'node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0', '--port', String(PORT)], {
    cwd: root.replace(/\/$/, ''),
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', (b) => { log += b.toString(); });
  server.stderr.on('data', (b) => { log += b.toString(); });
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error('Startup timeout. Log:\n' + log)), 60000);
    server.stdout.on('data', (b) => { if (b.toString().includes('Ready')) { clearTimeout(timer); done(); } });
    server.on('exit', (code) => fail(new Error('Server exited ' + code + '\n' + log)));
  });

  browser = await pw.launch({ executablePath: chromiumPath, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-proxy-server', `--host-resolver-rules=MAP kebu.africa 127.0.0.1, MAP ${new URL(CLOUD).hostname} 127.0.0.1`] });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Route loopback requests explicitly; this does not require changing machine DNS.
  await page.route(MAIN + '/**', async route => {
    const original = new URL(route.request().url());
    const response = await route.fetch({ url: `http://127.0.0.1:${PORT}${original.pathname}${original.search}`, headers: { ...route.request().headers(), host: original.host } });
    await route.fulfill({ response });
  });
  const mainRequestCookies = [];
  const cloudRequestCookies = [];
  page.on('request', (req) => {
    const url = req.url();
    void req.allHeaders().then((headers) => {
      const cookieHeader = headers['cookie'] ?? '';
      if (url.startsWith(MAIN)) mainRequestCookies.push({ url, cookieHeader });
      if (url.startsWith(CLOUD)) cloudRequestCookies.push({ url, cookieHeader });
    });
  });

  // 1) Load the real main-app origin and set the cookie with the app's exact attributes.
  await page.goto(MAIN + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ name, value }) => {
    document.cookie = `${name}=${value}; Path=/; SameSite=Lax`;
  }, { name: SECRET_COOKIE, value: SECRET_VALUE });
  const cookiesOnMain = await context.cookies([MAIN + '/']);
  const mainHasSecret = cookiesOnMain.some((c) => c.name === SECRET_COOKIE && c.value === SECRET_VALUE);
  result.steps.push({ step: 'cookie set on main host', pass: mainHasSecret, detail: cookiesOnMain.map((c) => `${c.name}@${c.domain}`) });
  if (!mainHasSecret) throw new Error('Setup failed: cookie was not actually set on the main host.');

  // 2) Reload the main host once more -- the cookie SHOULD be sent back (sanity check
  //    that our capture mechanism actually works and the cookie is a real, live cookie).
  mainRequestCookies.length = 0;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const sentBackOnReload = mainRequestCookies.some((c) => c.cookieHeader.includes(SECRET_COOKIE));
  result.steps.push({ step: 'cookie re-sent on main-host reload (sanity check)', pass: sentBackOnReload, detail: [...mainRequestCookies] });

  // 3) Navigate to the distinct Cloud-deployment origin and check (a) document.cookie
  //    there, (b) whether ANY request to that origin carried the secret cookie.
  cloudRequestCookies.length = 0;
  // A static uploaded page with the exact serving policy; no hosted database is used.
  await page.route(CLOUD + '/**', route => route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Content-Security-Policy': CLOUD_STATIC_CSP }, body: '<!doctype html><title>Untrusted static upload</title><p>Cloud policy test</p>' }));
  await page.goto(CLOUD + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const docCookieOnCloud = await page.evaluate(() => { try { return document.cookie; } catch { return "Sandbox blocked cookie access"; } });
  // context.cookies([url]) is informational only here: CDP's Network.getCookies
  // (what Playwright's context.cookies() wraps) reports cookies by a looser
  // "could this domain match" rule than the browser's actual same-host send
  // decision, so it is NOT a reliable signal for this property -- it's included
  // in the detail for transparency but deliberately excluded from the pass/fail
  // verdict below, which instead uses the two signals that directly correspond
  // to what an attacker's JS on the uploaded site could actually observe or
  // exfiltrate: what document.cookie reads, and what the real network request
  // actually carried in its Cookie header.
  const cloudCookieJarInformationalOnly = await context.cookies([CLOUD + '/']);
  const cloudSawSecretViaJs = docCookieOnCloud.includes(SECRET_COOKIE);
  const cloudSawSecretOnWire = cloudRequestCookies.some((c) => c.cookieHeader.includes(SECRET_COOKIE));
  result.steps.push({
    step: 'main-app cookie NOT visible via document.cookie nor sent on the wire to the Cloud-deployment origin',
    pass: !cloudSawSecretViaJs && !cloudSawSecretOnWire,
    detail: {
      docCookieOnCloud,
      cloudRequestCookies,
      cloudCookieJarInformationalOnly: cloudCookieJarInformationalOnly.map((c) => `${c.name}@${c.domain}`),
      note: 'cloudCookieJarInformationalOnly uses Playwright context.cookies(), a CDP API with looser domain-match reporting than real same-host send behavior -- not used for the verdict.',
    },
  });

  // 4) An untrusted page may try credentialed mutations: lack of readable
  // cookies is not a CSRF defense. The actual API must reject its Origin.
  // HTTPS-only CSP blocks our HTTP loopback fetch, so exercise the equivalent
  // opaque sandbox Origin with the browser request client against the real API.
  const mutation = await context.request.post(`http://127.0.0.1:${PORT}/api/cloud/buckets`, {
    headers: { Origin: 'null', 'Content-Type': 'application/json' }, data: { name: 'attacker-created' },
  });
  result.steps.push({ step: 'actual Cloud API rejects opaque sandbox Origin before authentication or mutation', pass: mutation.status() === 403, detail: { status: mutation.status() } });

  result.overallPass = result.steps.every((s) => s.pass);
  console.log('CLOUD_ORIGIN_ISOLATION_RESULT', JSON.stringify(result, null, 2));
  if (!result.overallPass) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await stopChild(server);
}
