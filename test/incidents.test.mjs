import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileIncidents, incidentId } from '../scripts/incidents.mjs';

test('incidentId is deterministic', () => {
  const a = incidentId('svc', { title: 'Foo', url: 'http://x' });
  const b = incidentId('svc', { title: 'Foo', url: 'http://x' });
  assert.equal(a, b);
  assert.match(a, /^svc-/);
});

test('incidentId differs by title', () => {
  const a = incidentId('svc', { title: 'Foo', url: 'http://x' });
  const b = incidentId('svc', { title: 'Bar', url: 'http://x' });
  assert.notEqual(a, b);
});

test('reconcileIncidents creates records with provider', async () => {
  const origFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '[{"id":"group:Amazon","text":"AWS is having a moment."}]' } }], model: 'test' }) });
  try {
    const services = [
      { id: 'aws', name: 'Amazon Web Services', provider: 'Amazon', category: 'Cloud', weight: 'XXL', status: { state: 'cooked', detail: 'd', incidents: [{ title: 'EC2 degraded', url: 'u1' }] } },
    ];
    const out = await reconcileIncidents(services, []);
    assert.equal(out.length, 1);
    assert.equal(out[0].provider, 'Amazon');
    assert.equal(out[0].summary, 'AWS is having a moment.');
    assert.equal(out[0].summaryPending, false);
    assert.equal(out[0].state, 'cooked');
  } finally {
    global.fetch = origFetch;
  }
});

test('reconcileIncidents marks resolved when gone', async () => {
  const origFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '[]' } }], model: 'test' }) });
  try {
    const prev = [{ id: 'aws-abc', serviceId: 'aws', serviceName: 'AWS', provider: 'Amazon', category: 'Cloud', weight: 'XXL', title: 'old', url: '', state: 'cooked', detectedAt: '2026-01-01T00:00:00Z', firstSeenAt: '2026-01-01T00:00:00Z', lastSeenAt: '2026-01-01T00:00:00Z', resolvedAt: null, summary: 's', summaryModel: 'm', summaryAt: '2026-01-01T00:00:00Z', summaryError: null, summaryAttempts: 0, summaryPending: false }];
    const services = [{ id: 'aws', name: 'AWS', provider: 'Amazon', category: 'Cloud', weight: 'XXL', status: { state: 'ok', detail: 'fine', incidents: [] } }];
    const out = await reconcileIncidents(services, prev);
    const resolved = out.find(i => i.id === 'aws-abc');
    assert.ok(resolved);
    assert.ok(resolved.resolvedAt);
  } finally {
    global.fetch = origFetch;
  }
});

test('reconcileIncidents handles LLM failure gracefully', async () => {
  const origFetch = global.fetch;
  global.fetch = async () => { throw new Error('network down'); };
  try {
    const services = [{ id: 'gcp', name: 'GCP', provider: 'Google', category: 'Cloud', weight: 'XXL', status: { state: 'sus', detail: 'd', incidents: [{ title: 'GCE issue', url: 'u' }] } }];
    const out = await reconcileIncidents(services, []);
    assert.equal(out.length, 1);
    assert.equal(out[0].summary, null);
    assert.ok(out[0].summaryError);
  } finally {
    global.fetch = origFetch;
  }
});