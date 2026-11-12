/** Local unconfigured-auth regression only. Child credentials are cleared; no remote writes. */
import { chromium as playwright } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = process.env.KEBU_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), 'kebu-network-ui-'));
const executablePath = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH;
if (!executablePath) throw Error('Set KEBU_CHROMIUM_EXECUTABLE_PATH to an installed local Chromium executable.');

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '38415'], { cwd: root, env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_SECRET_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Startup timeout')), 20000); server.stdout.on('data', value => { if(value.toString().includes('Ready')) { clearTimeout(timer); resolve(); } }); server.on('exit', code => reject(Error('Server exited '+code))); });
import { writeFile } from 'node:fs/promises';
const browser = await playwright.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-software-rasterizer", "--no-zygote"], headless: true });
const results = [];
try {
 for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:38415/network');
  await page.getByText('Could not load members. Please retry.', {exact:true}).waitFor({ timeout: 10000 }).catch(async error => { console.log('DEBUG',page.url(), await page.locator('body').innerText(),errors); await page.screenshot({path:join(output, 'browser-debug.png'),fullPage:true}); throw error; });
  assert.match(await page.getByText('Could not load members. Please retry.', {exact:true}).innerText(), /Could not load members/);
  assert.equal(await page.getByText('Active members', { exact: true }).count(), 0);
  assert.equal(await page.getByText('Example profiles', { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: join(output, `network-${width}.png`), fullPage: true });
  await page.getByRole('button', { name: 'Retry loading members' }).click();
  await page.getByText('Could not load members. Please retry.', {exact:true}).waitFor();
  await page.goto('http://127.0.0.1:38415/network/join');
  await page.locator('#network-name').fill('QA retained draft');
  await page.locator('#network-location').fill('Dakar');
  await page.locator('#network-country').fill('Senegal');
  await page.locator('#network-sector').selectOption('Creative economy');
  await page.locator('#network-headline').fill('Creating a studio');
  await page.locator('#network-building').fill('A creative studio');
  await page.locator('#network-offering').fill('Design services');
  await page.getByRole('button', { name: 'Partner', exact: true }).click();
  await page.locator('#network-stage').selectOption('Idea');
  await page.getByRole('button', { name: /Join/ }).last().click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('#network-name').inputValue(), 'QA retained draft');
  assert.equal(await page.getByText("You're in the network", { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: join(output, `network-join-${width}.png`), fullPage: true });
  assert.deepEqual(errors, []);
  results.push({ width, actualApiFailure: true, retainedDraft: true, noFalseSuccess: true, noOverflow: true, pageErrors: errors });
  await page.close();
 }
 const page = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-proto": "https" } });
 for(const path of ['/studio/33333333-3333-4333-8333-333333333333','/create/33333333-3333-4333-8333-333333333333']) {
  await page.goto('http://127.0.0.1:38415'+path);
  const response = await page.request.get('http://127.0.0.1:38415/api'+ (path.startsWith('/studio') ? '/create/designs' + path.slice('/studio'.length) : '/projects' + path.slice('/create'.length)));
  assert.equal(response.status(), 503);
  results.push({ path, actualAuthUnavailable: true });
 }
 await writeFile(join(output, 'browser-results.json'), JSON.stringify(results, null, 2));
 console.log(JSON.stringify(results));
} finally { await browser.close(); server.kill(); }
