import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, STATES, STATE_RANK } from '../src/normalize.js';

test('STATES has all expected keys', () => {
  for (const k of ['ok','maintenance','sus','cooked','meltdown','unknown']) {
    assert.ok(STATES[k], k);
    assert.equal(typeof STATES[k].label, 'string');
    assert.equal(typeof STATES[k].color, 'string');
  }
});

test('STATE_RANK orders severity ascending', () => {
  assert.ok(STATE_RANK.ok < STATE_RANK.sus);
  assert.ok(STATE_RANK.sus < STATE_RANK.cooked);
  assert.ok(STATE_RANK.cooked < STATE_RANK.meltdown);
});

test('normalize: statuspage operational -> ok', () => {
  const raw = { status: { indicator: 'none', description: 'All good' }, components: [], incidents: [] };
  const r = normalize({ type: 'statuspage', url: 'x' }, raw);
  assert.equal(r.state, 'ok');
});

test('normalize: statuspage major incident -> cooked/meltdown', () => {
  const raw = { status: { indicator: 'major' }, components: [{ name: 'API', status: 'major_outage' }], incidents: [] };
  const r = normalize({ type: 'statuspage', url: 'x' }, raw);
  assert.equal(r.state, 'meltdown');
});

test('normalize: gcp active sev1 -> meltdown', () => {
  const raw = [{ service_name: 'Compute', severity: 'SEV1', external_desc: 'outage', affected_products: [] }];
  const r = normalize({ type: 'gcp', url: 'x' }, raw);
  assert.equal(r.state, 'meltdown');
});

test('normalize: gcp no active -> ok', () => {
  const raw = [{ service_name: 'Compute', severity: 'SEV4', end: '2020-01-01T00:00:00Z', external_desc: 'old' }];
  const r = normalize({ type: 'gcp', url: 'x', filter: 'Compute' }, raw);
  // filtered out (end in past) -> ok
  assert.equal(r.state, 'ok');
});

test('normalize: aws recent item -> sus/cooked', () => {
  const now = Date.now();
  const pubDate = new Date(now - 60000).toUTCString();
  const raw = `<rss><channel><item><title>EC2 issue</title><description>degradation</description><pubDate>${pubDate}</pubDate><link>u</link></item></channel></rss>`;
  const r = normalize({ type: 'aws', url: 'x' }, raw);
  assert.ok(['sus','cooked'].includes(r.state));
  assert.equal(r.incidents.length, 1);
});

test('normalize: unknown type -> unknown', () => {
  const r = normalize({ type: 'nope', url: 'x' }, {});
  assert.equal(r.state, 'unknown');
});

test('normalize: throws are caught', () => {
  const r = normalize({ type: 'statuspage', url: 'x' }, null);
  assert.equal(r.state, 'unknown');
});

test('normalize: result incidents capped at 5', () => {
  const raw = { status: { indicator: 'minor' }, components: [], incidents: Array.from({length: 8}, (_,i) => ({ name: `inc${i}`, status: 'investigating', impact: 'minor', shortlink: `u${i}` })) };
  const r = normalize({ type: 'statuspage', url: 'x' }, raw);
  assert.ok(r.incidents.length <= 5);
});


test('normalize: statuspage minor indicator with partial_outage components stays sus (no cooked)', () => {
  const raw = {
    status: { indicator: 'minor', description: 'Partially Degraded Service' },
    components: [
      { name: 'Cloudflare Sites and Services', status: 'degraded_performance' },
      { name: 'Workers', status: 'degraded_performance' },
      { name: 'North America', status: 'partial_outage' },
      { name: 'Europe', status: 'partial_outage' },
    ],
    incidents: [{ name: 'Workers event subscription', status: 'identified', impact: 'minor', shortlink: 'u' }],
  };
  const r = normalize({ type: 'statuspage', url: 'x' }, raw);
  assert.equal(r.state, 'sus');
});

test('normalize: statuspage no indicator keeps component-driven cooked', () => {
  const raw = { status: {}, components: [{ name: 'API', status: 'partial_outage' }], incidents: [] };
  const r = normalize({ type: 'statuspage', url: 'x' }, raw);
  assert.equal(r.state, 'cooked');
});
