import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());

test('build produces dist with required files', () => {
  execFileSync('node', ['scripts/build.mjs'], { cwd: ROOT, stdio: 'pipe' });
  for (const f of ['index.html','styles.css','app.js','normalize.js','logic.js']) {
    assert.ok(existsSync(resolve(ROOT, 'dist', f)), `missing ${f}`);
  }
});

test('built index.html contains dashboard markers', () => {
  const html = readFileSync(resolve(ROOT, 'dist', 'index.html'), 'utf8');
  assert.match(html, /ROBOT TAKEOVER IN PROGRESS/);
  assert.match(html, /OVERALL STATUS/);
  assert.match(html, /THREAT LEVEL/);
  assert.match(html, /MAJOR SERVICES \/ STATUS/);
  assert.match(html, /INCIDENT CHATTER/);
  assert.match(html, /RECENT EVENTS/);
  assert.match(html, /BOT STATUS/);
});

test('built app.js imports logic module', () => {
  const js = readFileSync(resolve(ROOT, 'dist', 'app.js'), 'utf8');
  assert.match(js, /from '.\/logic.js'/);
});

test('logic.js exports threat', () => {
  const m = readFileSync(resolve(ROOT, 'dist', 'logic.js'), 'utf8');
  assert.match(m, /export function threat/);
});