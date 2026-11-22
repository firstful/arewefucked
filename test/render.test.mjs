import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { threat, groupIncidents, functionalPercent } from '../src/logic.js';

const fixture = JSON.parse(readFileSync(resolve(process.cwd(), 'test/fixtures/status.sample.json'), 'utf8'));

test('render: threat level for sample snapshot is DEGRADED (single cloudflare incident not critical)', () => {
  const r = threat(fixture.services);
  assert.equal(r.level.n, 3);
  assert.equal(r.level.caption, 'DEGRADED');
});

test('render: functionalPercent reflects majority healthy (cloudflare cooked but weighted)', () => {
  const pct = functionalPercent(fixture.services);
  // ok weight = 4+4 = 8; total = 4+4+4+3+1 = 16; 8/16 = 50%
  assert.equal(pct, 50);
});

test('render: groupIncidents groups cloudflare + github + minor into 3 groups', () => {
  const active = fixture.services
    .filter((s) => s.status.state !== 'ok')
    .map((s) => ({
      id: s.id,
      serviceId: s.id,
      serviceName: s.name,
      provider: s.provider,
      state: s.status.state,
      title: s.status.incidents?.[0]?.title || s.status.detail,
      detectedAt: fixture.timestamp,
      lastSeenAt: fixture.timestamp,
      summary: null,
      url: s.status.incidents?.[0]?.url || '',
      weight: s.weight,
    }));
  const groups = groupIncidents(active);
  assert.equal(groups.length, 3);
  assert.ok(groups.find((g) => g.provider === 'Cloudflare'));
  assert.ok(groups.find((g) => g.provider === 'GitHub'));
  assert.ok(groups.find((g) => g.provider === 'Acme'));
});

test('render: summary counts match fixture', () => {
  const counts = fixture.services.reduce((acc, s) => { acc[s.status.state] = (acc[s.status.state] || 0) + 1; return acc; }, {});
  assert.equal(counts.ok, 2);
  assert.equal(counts.cooked, 2);
  assert.equal(counts.sus, 1);
});