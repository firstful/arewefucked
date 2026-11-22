import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileIncidents } from '../scripts/incidents.mjs';

test('reconcile: tick1 creates incident; tick2 resolves it when gone', async () => {
  const origFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '[]' } }], model: 't' }) });
  try {
    // tick 1: cloudflare cooked
    const tick1Services = [{ id: 'cloudflare', name: 'Cloudflare', provider: 'Cloudflare', category: 'Edge', weight: 'XXL', status: { state: 'cooked', detail: 'API degraded', incidents: [{ title: 'Elevated errors', url: 'u1' }] } }];
    const ledger1 = await reconcileIncidents(tick1Services, []);
    assert.equal(ledger1.length, 1);
    assert.equal(ledger1[0].resolvedAt, null);
    const id = ledger1[0].id;

    // tick 2: cloudflare ok -> resolved
    const tick2Services = [{ id: 'cloudflare', name: 'Cloudflare', provider: 'Cloudflare', category: 'Edge', weight: 'XXL', status: { state: 'ok', detail: 'All good', incidents: [] } }];
    const ledger2 = await reconcileIncidents(tick2Services, ledger1);
    const resolved = ledger2.find((i) => i.id === id);
    assert.ok(resolved, 'incident should still be in ledger');
    assert.ok(resolved.resolvedAt, 'incident should be resolved');
  } finally {
    global.fetch = origFetch;
  }
});

test('reconcile: tick2 keeps incident active if still present', async () => {
  const origFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '[]' } }], model: 't' }) });
  try {
    const tick1Services = [{ id: 'github', name: 'GitHub', provider: 'GitHub', category: 'Dev', weight: 'XL', status: { state: 'sus', detail: 'slow', incidents: [{ title: 'Actions slow', url: 'u2' }] } }];
    const ledger1 = await reconcileIncidents(tick1Services, []);

    const tick2Services = [{ id: 'github', name: 'GitHub', provider: 'GitHub', category: 'Dev', weight: 'XL', status: { state: 'sus', detail: 'still slow', incidents: [{ title: 'Actions slow', url: 'u2' }] } }];
    const ledger2 = await reconcileIncidents(tick2Services, ledger1);
    const active = ledger2.filter((i) => !i.resolvedAt);
    assert.equal(active.length, 1);
  } finally {
    global.fetch = origFetch;
  }
});

test('reconcile: new incident on tick2 gets added', async () => {
  const origFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '[]' } }], model: 't' }) });
  try {
    const tick1Services = [{ id: 'aws', name: 'AWS', provider: 'Amazon', category: 'Cloud', weight: 'XXL', status: { state: 'ok', detail: 'fine', incidents: [] } }];
    const ledger1 = await reconcileIncidents(tick1Services, []);

    const tick2Services = [
      { id: 'aws', name: 'AWS', provider: 'Amazon', category: 'Cloud', weight: 'XXL', status: { state: 'ok', detail: 'fine', incidents: [] } },
      { id: 'cloudflare', name: 'Cloudflare', provider: 'Cloudflare', category: 'Edge', weight: 'XXL', status: { state: 'cooked', detail: 'down', incidents: [{ title: 'CF outage', url: 'u' }] } },
    ];
    const ledger2 = await reconcileIncidents(tick2Services, ledger1);
    assert.equal(ledger2.filter((i) => !i.resolvedAt).length, 1);
    assert.ok(ledger2.find((i) => i.serviceId === 'cloudflare'));
  } finally {
    global.fetch = origFetch;
  }
});

test('reconcile: summary is shared within provider group', async () => {
  const origFetch = global.fetch;
  let callCount = 0;
  global.fetch = async () => {
    callCount++;
    return { ok: true, json: async () => ({ choices: [{ message: { content: '[{"id":"group:Amazon","text":"AWS is having a moment."}]' } }], model: 't' }) };
  };
  try {
    const services = [
      { id: 'aws', name: 'AWS EC2', provider: 'Amazon', category: 'Cloud', weight: 'XXL', status: { state: 'cooked', detail: 'd', incidents: [{ title: 'EC2 degraded', url: 'u1' }] } },
      { id: 'aws-rds', name: 'AWS RDS', provider: 'Amazon', category: 'Cloud', weight: 'XL', status: { state: 'sus', detail: 'd2', incidents: [{ title: 'RDS slow', url: 'u2' }] } },
    ];
    const out = await reconcileIncidents(services, []);
    assert.equal(out.length, 2);
    // both should share the same summary (one LLM call for the group)
    assert.equal(out[0].summary, out[1].summary);
    assert.equal(callCount, 1);
  } finally {
    global.fetch = origFetch;
  }
});