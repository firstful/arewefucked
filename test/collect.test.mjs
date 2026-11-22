import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerFor } from '../scripts/collect.mjs';

test('providerFor: uses service.provider if set', () => {
  assert.equal(providerFor({ id: 'x', provider: 'Foo', source: { url: 'https://status.example.com/' } }), 'Foo');
});

test('providerFor: derives from hostname (strips www/status)', () => {
  assert.equal(providerFor({ id: 'x', source: { url: 'https://status.akamai.com/api/v2/summary.json' } }), 'akamai.com');
});

test('providerFor: friendly labels for known hosts', () => {
  assert.equal(providerFor({ id: 'x', source: { url: 'https://status.cloud.google.com/incidents.json' } }), 'Google Cloud');
  assert.equal(providerFor({ id: 'x', source: { url: 'https://www.githubstatus.com/api/v2/summary.json' } }), 'GitHub');
  assert.equal(providerFor({ id: 'x', source: { url: 'https://www.cloudflarestatus.com/api/v2/summary.json' } }), 'Cloudflare');
});

test('providerFor: no url falls back to id', () => {
  assert.equal(providerFor({ id: 'myservice', source: {} }), 'myservice');
});