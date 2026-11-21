import { SERVICES, WEIGHTS } from '../src/catalog.js';
import { normalize } from '../src/normalize.js';
import { incidentId, reconcileIncidents } from './incidents.mjs';
import { generateHeadline } from './headline.mjs';

const MAX_ATTEMPTS = Math.max(1, Number(process.env.FETCH_RETRIES || 3));
const BASE_DELAY = Math.max(50, Number(process.env.FETCH_BACKOFF_MS || 600));
const cache = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PROVIDER_LABELS = {
  'status.aws.amazon.com': 'Amazon Web Services',
  'status.cloud.google.com': 'Google Cloud',
  'azure.status.microsoft': 'Microsoft Azure',
  'status.azure.com': 'Microsoft Azure',
  'www.cloudflarestatus.com': 'Cloudflare',
  'www.githubstatus.com': 'GitHub',
};

function providerFor(service) {
  if (service.provider) return service.provider;
  const url = service?.source?.url;
  if (!url) return service.id || 'unknown';
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (PROVIDER_LABELS[host]) return PROVIDER_LABELS[host];
    return host.replace(/^www\./, '').replace(/^status\./, '');
  } catch {
    return service.id || 'unknown';
  }
}

function retryDelay(attempt, response) {
  const retryAfter = response?.headers?.get?.('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(60000, seconds * 1000);
    const at = Date.parse(retryAfter);
    if (Number.isFinite(at)) return Math.min(60000, Math.max(0, at - Date.now()));
  }
  return Math.min(15000, BASE_DELAY * 2 ** (attempt - 1) + Math.random() * 250);
}

async function fetchSource(url) {
  if (cache.has(url)) return cache.get(url);
  const task = (async () => {
    let lastError = 'unknown error';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      let response;
      try {
        response = await fetch(url, {
          signal: AbortSignal.timeout(12000 + attempt * 3000),
          headers: { 'user-agent': 'susmeter/1.0 (+status aggregator)', accept: 'application/json, application/xml, text/xml, text/html, */*' },
        });
        if (response.ok) {
          const text = await response.text();
          const type = response.headers.get('content-type') || '';
          if (/json|javascript/i.test(type) || /^[{[]/.test(text.trim())) return JSON.parse(text);
          return text;
        }
        lastError = `HTTP ${response.status}`;
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable) break;
      } catch (error) {
        lastError = String(error?.message || error);
      }
      if (attempt < MAX_ATTEMPTS) {
        const delay = retryDelay(attempt, response);
        console.error(`[susmeter] ${url} attempt ${attempt}/${MAX_ATTEMPTS} failed (${lastError}); retrying in ${Math.round(delay)}ms`);
        await sleep(delay);
      }
    }
    return { __error: lastError };
  })().catch((error) => ({ __error: String(error?.message || error) }));
  cache.set(url, task);
  return task;
}

export async function collect(previousServices = [], previousIncidents = []) {
  cache.clear();
  const previous = new Map(previousServices.filter((s) => s?.id).map((s) => [s.id, s]));
  const generatedAt = new Date().toISOString();

  const services = await Promise.all(SERVICES.map(async (service) => {
    const weight = WEIGHTS[service.id] || 'M';
    const old = previous.get(service.id);
    const fallback = (error) => old
      ? {
          ...old,
          status: old.status,
          fetchedAt: old.fetchedAt || generatedAt,
          lastGoodFetchAt: old.lastGoodFetchAt || old.fetchedAt || null,
          feedOk: false,
          stale: true,
          weight,
          provider: old.provider || providerFor(service),
        }
      : {
          ...service,
          weight,
          status: { state: 'unknown', detail: `Feed unreachable: ${error}`, incidents: [] },
          fetchedAt: generatedAt,
          lastGoodFetchAt: null,
          feedOk: false,
          stale: false,
          provider: providerFor(service),
        };

    if (!service.source.url) return fallback('No public status feed');
    const raw = await fetchSource(service.source.url);
    if (raw?.__error) return fallback(raw.__error);
    return {
      id: service.id,
      name: service.name,
      weight,
      category: service.category,
      url: service.url,
      provider: providerFor(service),
      source: { type: service.source.type, filter: service.source.filter || null, url: service.source.url },
      status: normalize(service.source, raw),
      fetchedAt: new Date().toISOString(),
      lastGoodFetchAt: new Date().toISOString(),
      feedOk: true,
      stale: false,
    };
  }));

  for (const service of services) {
    service.status.incidents = (service.status.incidents || []).map((incident) => ({
      ...incident,
      id: String(incident.id || incidentId(service.id, incident)),
    }));
  }

  const incidents = await reconcileIncidents(services, previousIncidents);
  const headline = await generateHeadline(services);
  return { generatedAt, timestamp: generatedAt, services, incidents, headline };
}
