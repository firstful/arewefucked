// Real DOM render tests: load the actual index.html + app.js in jsdom,
// feed it hardcoded JSON via a stubbed fetch, and assert on rendered output.
// This validates what a user actually SEES, not just pure functions.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = process.cwd();
const fixture = JSON.parse(readFileSync(resolve(ROOT, 'test/fixtures/status.sample.json'), 'utf8'));

let dom;
let originalFetch;
let renderError = null;

before(async () => {
  const html = readFileSync(resolve(ROOT, 'public/index.html'), 'utf8');
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => { renderError = e; });

  dom = new JSDOM(html, {
    url: 'http://localhost/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole,
  });

  // Stub fetch in the jsdom window to return the hardcoded JSON.
  dom.window.fetch = async (url) => ({
    ok: true,
    status: 200,
    json: async () => fixture,
  });

  // Expose Node globals the app / logic modules rely on.
  dom.window.Date = Date;
  dom.window.setInterval = () => 0; // suppress timers
  dom.window.clearInterval = () => {};

  // Load app.js as an ES module in the jsdom realm. We rewrite the bare
  // relative imports to absolute file URLs so Node resolves them, but keep
  // execution in the jsdom window by injecting globals.
  const appSrc = readFileSync(resolve(ROOT, 'public/app.js'), 'utf8');
  const logicSrc = readFileSync(resolve(ROOT, 'src/logic.js'), 'utf8');
  const normalizeSrc = readFileSync(resolve(ROOT, 'src/normalize.js'), 'utf8');

  // Write temp ESM modules with rewritten import paths, evaluated in Node
  // but with document/location/fetch wired to jsdom globals.
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.location = dom.window.location;
  globalThis.fetch = dom.window.fetch;
  globalThis.setInterval = () => 0;
  globalThis.alert = () => {};

  const tmpDir = resolve(ROOT, '.render-tmp');
  mkdirSync(tmpDir, { recursive: true });
  // Map imports to sibling temp copies
  const logicPath = resolve(tmpDir, 'logic.mjs');
  const normPath = resolve(tmpDir, 'normalize.mjs');
  const appPath = resolve(tmpDir, 'app.mjs');
  writeFileSync(logicPath, logicSrc);
  writeFileSync(normPath, normalizeSrc);
  const rewritten = appSrc
    .replace("from './normalize.js'", `from '${pathToFileURL(normPath).href}'`)
    .replace("from './logic.js'", `from '${pathToFileURL(logicPath).href}'`);
  writeFileSync(appPath, rewritten);

  try {
    await import(pathToFileURL(appPath).href + '?t=' + Date.now());
    // app.js kicks off loadSnapshot() asynchronously; give microtasks time.
    await new Promise((r) => setTimeout(r, 50));
  } catch (e) {
    renderError = e;
  }
});

after(() => {
  if (dom) dom.window.close();
  for (const k of ['window','document','location','fetch','setInterval','alert']) delete globalThis[k];
  rmSync(resolve(process.cwd(), '.render-tmp'), { recursive: true, force: true });
});

test('render: app.js loaded without throwing', () => {
  assert.equal(renderError, null, renderError && renderError.stack);
});

test('render: overall functional % shows weighted value from fixture', () => {
  const pct = dom.window.document.getElementById('overall-pct').textContent;
  assert.equal(pct, '50%');
});

test('render: threat level reflects DEGRADED for fixture', () => {
  const lvl = dom.window.document.getElementById('threat-level').textContent;
  assert.equal(lvl, 'DEGRADED');
});

test('render: bot status shows DEGRADED bot line', () => {
  const bot = dom.window.document.getElementById('bot-status').textContent;
  assert.match(bot, /Degraded but operational/);
});

test('render: service status table rendered rows', () => {
  const rows = dom.window.document.querySelectorAll('#services-table .svc-row');
  assert.ok(rows.length >= 3, `expected >=3 rows, got ${rows.length}`);
});

test('render: service table includes Cloudflare with OUTAGE label', () => {
  const table = dom.window.document.getElementById('services-table').textContent;
  assert.match(table, /Cloudflare/);
  assert.match(table, /OUTAGE/);
});

test('render: summary line reports real counts, not hardcoded', () => {
  const summary = dom.window.document.getElementById('summary').textContent;
  assert.match(summary, /5 services checked/);
  assert.match(summary, /2 clean/);
  assert.match(summary, /2 outage/);
  assert.doesNotMatch(summary, /impact/); // removed: unexplained metric
});

test('render: verdict uses published headline text', () => {
  const verdict = dom.window.document.getElementById('verdict').textContent;
  assert.equal(verdict, 'test headline');
});

test('render:svc-count shows service total', () => {
  assert.match(dom.window.document.getElementById('svc-count').textContent, /5 services/);
});

test('render: table has column headers', () => {
  const head = dom.window.document.querySelector('#services-table .svc-head');
  assert.ok(head, 'expected a header row');
  assert.match(head.textContent, /SERVICE/);
  assert.match(head.textContent, /STATUS/);
  assert.match(head.textContent, /HEALTH/);
});

test('render: health bar reflects real state (OUTAGE short, NOMINAL full)', () => {
  const rows = [...dom.window.document.querySelectorAll('#services-table .svc-row:not(.svc-head)')];
  const cf = rows.find((r) => r.textContent.includes('Cloudflare'));
  const aws = rows.find((r) => r.textContent.includes('AWS'));
  const cfBar = cf.querySelector('.svc-bar > span').style.width;
  const awsBar = aws.querySelector('.svc-bar > span').style.width;
  assert.equal(cfBar, '15%');  // cooked/OUTAGE
  assert.equal(awsBar, '100%'); // ok/NOMINAL
});

test('render: Recent Events populated from troubled services even without incident ledger', () => {
  const events = dom.window.document.getElementById('recent-events').textContent;
  assert.match(events, /Cloudflare/);
  assert.match(events, /GitHub/);
  assert.doesNotMatch(events, /^No events/);
});

test('render: category counts use singular for one service', () => {
  const heads = [...dom.window.document.querySelectorAll('#sections .section-head span')].map((s) => s.textContent);
  assert.ok(heads.includes('1 service'), `expected "1 service", got ${JSON.stringify(heads)}`);
  assert.ok(!heads.some((h) => h === '1 services'));
});
