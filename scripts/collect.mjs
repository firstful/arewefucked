import { SERVICES, WEIGHTS } from '../src/catalog.js';
import { normalize } from '../src/normalize.js';

const cache = new Map();

async function fetchSource(url) {
  if (cache.has(url)) return cache.get(url);
  const task = (async () => {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': 'susmeter/1.0 (+status aggregator)', accept: 'application/json, application/xml, text/xml, text/html, */*' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const type = response.headers.get('content-type') || '';
    if (/json|javascript/i.test(type) || /^[{[]/.test(text.trim())) return JSON.parse(text);
    return text;
  })().catch((error) => ({ __error: String(error?.message || error) }));
  cache.set(url, task);
  return task;
}

export async function collect() {
  cache.clear();
  const generatedAt = new Date().toISOString();
  const services = await Promise.all(SERVICES.map(async (service) => {
    const weight = WEIGHTS[service.id] || 'M';
    const source = service.source;
    if (!source.url) {
      return { ...service, weight, status: normalize(source, null), fetchedAt: generatedAt, feedOk: false };
    }
    const raw = await fetchSource(source.url);
    const feedOk = !raw?.__error;
    const status = feedOk
      ? normalize(source, raw)
      : { state: 'unknown', detail: `Feed unreachable: ${raw.__error}`, incidents: [] };
    return {
      id: service.id,
      name: service.name,
      weight,
      category: service.category,
      url: service.url,
      source: { type: source.type, filter: source.filter || null, url: source.url },
      status,
      fetchedAt: new Date().toISOString(),
      feedOk,
    };
  }));
  return { generatedAt, timestamp: generatedAt, services };
}
