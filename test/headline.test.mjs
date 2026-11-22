import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreServices } from '../scripts/headline.mjs';

test('scoreServices: empty -> level 5', () => {
  const r = scoreServices([]);
  assert.equal(r.n, 5);
  assert.equal(r.score, 0);
});

test('scoreServices: meltdown XL -> level 1', () => {
  const r = scoreServices([{ id:'x', weight:'XL', status:{ state:'meltdown' } }]);
  assert.equal(r.n, 1);
});

test('scoreServices: cooked XL -> level 2', () => {
  const r = scoreServices([{ id:'x', weight:'XL', status:{ state:'cooked' } }]);
  assert.equal(r.n, 2);
});

test('scoreServices: returns level object with caption', () => {
  const r = scoreServices([{ id:'x', weight:'M', status:{ state:'sus' } }]);
  assert.ok(r.level.caption);
  assert.equal(typeof r.level.fallback, 'string');
});

test('scoreServices: high score -> level 1', () => {
  const services = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, weight: 'XXL', status: { state: 'meltdown' } }));
  const r = scoreServices(services);
  assert.equal(r.n, 1);
});