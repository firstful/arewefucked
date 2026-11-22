import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreServices } from '../scripts/headline.mjs';

test('scoreServices: empty -> level 5', () => {
  const r = scoreServices([]);
  assert.equal(r.n, 5);
  assert.equal(r.score, 0);
});

test('scoreServices: single meltdown XL -> level 2 critical', () => {
  const r = scoreServices([{ id:'x', weight:'XL', status:{ state:'meltdown' } }]);
  assert.equal(r.n, 2);
});

test('scoreServices: cooked XL -> level 3 (single incident not critical)', () => {
  const r = scoreServices([{ id:'x', weight:'XL', status:{ state:'cooked' } }]);
  assert.equal(r.n, 3);
});

test('scoreServices: returns level object with caption', () => {
  const r = scoreServices([{ id:'x', weight:'M', status:{ state:'sus' } }]);
  assert.ok(r.level.caption);
  assert.equal(typeof r.level.verdict, 'string');
});

test('scoreServices: widespread meltdown -> level 1', () => {
  const services = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, weight: 'XXL', status: { state: 'meltdown' } }));
  const r = scoreServices(services);
  assert.equal(r.n, 1);
});