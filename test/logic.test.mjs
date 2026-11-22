import { test } from 'node:test';
import assert from 'node:assert/strict';
import { threat, humanize, relativeTime, SEVERITY, groupIncidents, functionalPercent, botStatusFor, LEVELS, WEIGHT_SCORE, IMPACT } from '../src/logic.js';

test('threat: no services -> level 5 nominal', () => {
  const r = threat([]);
  assert.equal(r.level.n, 5);
  assert.equal(r.score, 0);
});

test('threat: single meltdown XL -> level 2 critical', () => {
  const services = [{ id:'x', weight:'XL', status:{ state:'meltdown' } }];
  const r = threat(services);
  assert.equal(r.level.n, 2);
});

test('threat: cooked XL -> level 3 degraded (single incident not critical)', () => {
  const services = [{ id:'x', weight:'XL', status:{ state:'cooked' } }];
  const r = threat(services);
  assert.equal(r.level.n, 3);
});

test('threat: two cooked XXL -> level 2 critical', () => {
  const services = [
    { id:'a', weight:'XXL', status:{ state:'cooked' } },
    { id:'b', weight:'XXL', status:{ state:'cooked' } },
  ];
  const r = threat(services);
  assert.equal(r.level.n, 2);
});

test('threat: single meltdown XXL -> level 2 critical', () => {
  const services = [{ id:'x', weight:'XXL', status:{ state:'meltdown' } }];
  const r = threat(services);
  assert.equal(r.level.n, 2);
});

test('threat: returns score', () => {
  const services = [{ id:'x', weight:'M', status:{ state:'sus' } }];
  const r = threat(services);
  assert.equal(r.score, 2); // sus impact 1 * M weight 2
});

test('functionalPercent: single minor outage barely moves it', () => {
  const services = [
    { id:'a', weight:'M', status:{ state:'ok' } },
    { id:'b', weight:'M', status:{ state:'ok' } },
    { id:'c', weight:'M', status:{ state:'sus' } },
  ];
  assert.equal(functionalPercent(services), 67);
});

test('functionalPercent: all ok -> 100', () => {
  assert.equal(functionalPercent([{id:'a',weight:'M',status:{state:'ok'}}]), 100);
});

test('functionalPercent: empty -> 100 (no divide by zero)', () => {
  assert.equal(functionalPercent([]), 100);
});

test('humanize: minutes ago', () => {
  const iso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  assert.match(humanize(iso), /5 minutes ago/);
});

test('relativeTime: seconds', () => {
  const iso = new Date(Date.now() - 30 * 1000).toISOString();
  assert.match(relativeTime(iso), /30s ago/);
});

test('SEVERITY matches state ranks', () => {
  assert.equal(SEVERITY.meltdown, 4);
  assert.equal(SEVERITY.ok, 0);
  assert.equal(SEVERITY.unknown, 0);
});

test('humanize: just now', () => {
  const now = new Date().toISOString();
  assert.equal(humanize(now), 'just now');
});

test('botStatusFor returns level bot text', () => {
  const lvl = LEVELS.find(l => l.n === 2);
  assert.equal(botStatusFor(lvl), 'In Control, Fear Not.');
});

test('groupIncidents groups by provider', () => {
  const active = [
    { id:'a', serviceId:'aws', serviceName:'AWS', provider:'Amazon', state:'cooked', title:'t1', detectedAt:'2026-01-01T00:00:00Z', lastSeenAt:'2026-01-01T00:00:00Z', summary:'s1', url:'u1', weight:'XL' },
    { id:'b', serviceId:'aws-rds', serviceName:'RDS', provider:'Amazon', state:'sus', title:'t2', detectedAt:'2026-01-01T00:00:01Z', lastSeenAt:'2026-01-01T00:00:02Z', summary:null, url:'u2', weight:'L' },
    { id:'c', serviceId:'gcp', serviceName:'GCP', provider:'Google', state:'sus', title:'t3', detectedAt:'2026-01-01T00:00:00Z', lastSeenAt:'2026-01-01T00:00:00Z', summary:'s3', url:'u3', weight:'XXL' },
  ];
  const groups = groupIncidents(active);
  assert.equal(groups.length, 2);
  const amazon = groups.find(g => g.provider === 'Amazon');
  assert.equal(amazon.items.length, 2);
  assert.equal(amazon.summary, 's1'); // first with summary
  assert.equal(amazon.state, 'cooked'); // worst state
});

test('groupIncidents empty input', () => {
  assert.deepEqual(groupIncidents([]), []);
});

test('groupIncidents sorts by lastSeen desc', () => {
  const active = [
    { id:'a', serviceId:'a', serviceName:'A', provider:'P1', state:'sus', title:'t', detectedAt:'2026-01-01T00:00:00Z', lastSeenAt:'2026-01-01T00:00:00Z', summary:null, url:'', weight:'M' },
    { id:'b', serviceId:'b', serviceName:'B', provider:'P2', state:'sus', title:'t', detectedAt:'2026-01-01T00:00:00Z', lastSeenAt:'2026-01-02T00:00:00Z', summary:null, url:'', weight:'M' },
  ];
  const groups = groupIncidents(active);
  assert.equal(groups[0].provider, 'P2');
});