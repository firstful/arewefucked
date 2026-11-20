import { STATES } from './normalize.js';

const META_URL = document.querySelector('meta[name="status-json"]')?.content || './data/status.json';
const STATUS_URL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? './data/status.json' : META_URL;
const STALE_MS = 30 * 60 * 1000;
const LAST_GOOD_OLD_MS = 30 * 60 * 1000;
const LEVELS = [
  { n: 5, caption: 'NOMINAL', label: 'NOMINAL', color: '#5ee7a0', verdict: 'Nothing is on fire. For once.' },
  { n: 4, caption: 'ELEVATED', label: 'PLANNED / UNREADABLE', color: '#9aa7ff', verdict: 'Planned work or missing data. Nothing to panic about.' },
  { n: 3, caption: 'DEGRADED', label: 'DEGRADED', color: '#ffd166', verdict: 'A few services are off. Keep an eye on it.' },
  { n: 2, caption: 'CRITICAL', label: 'CRITICAL', color: '#ff9f5a', verdict: 'Yes, this is as bad as it looks.' },
  { n: 1, caption: 'MELTDOWN', label: 'MELTDOWN', color: '#ff5d7a', verdict: 'Several things are very, very not fine.' },
];
const WEIGHT_SCORE = { S: 1, M: 2, L: 3, XL: 4, XXL: 5 };
const IMPACT = { ok: 0, maintenance: 0.5, sus: 1, cooked: 2, meltdown: 3, unknown: 0 };

function threat(services) {
  const score = services.reduce((sum, s) => sum + (IMPACT[s.status.state] || 0) * (WEIGHT_SCORE[s.weight] || 2), 0);
  const major = services.some((s) => s.status.state === 'meltdown' && ['XL', 'XXL'].includes(s.weight));
  const critical = services.some((s) => s.status.state === 'cooked' && ['XL', 'XXL'].includes(s.weight));
  const n = score >= 40 || major ? 1 : score >= 12 || critical ? 2 : score >= 4 ? 3 : score > 0 ? 4 : 5;
  return { score, level: LEVELS.find((l) => l.n === n) };
}

function humanize(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(iso || '')) / 1000));
  if (!Number.isFinite(seconds)) return 'unknown';
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
const QUIPS = {
  ok: ['quiet.', 'no issues reported.', 'boring. in a good way.', 'all clear here.'],
  maintenance: ['planned downtime.', 'scheduled. not a surprise.', 'maintenance window. fine.'],
  sus: ['something is off.', 'degraded, but upright.', 'watching it.', 'minor trouble reported.'],
  cooked: ['this one is hurting.', 'a real incident, not vibes.', 'outage. sorry.', 'yep, that is broken.'],
  meltdown: ['major incident. no notes.', 'this is the bad one.', 'very not fine. click through.', 'critical.'],
  unknown: ['no readable feed.', 'status page unavailable.', 'no data. not assuming the worst.'],
};

let data = null;
let stale = false;
let dismissed = false;
let loading = false;
let query = '';
let category = 'All';
let stateFilter = 'All';

const el = (id) => document.getElementById(id);
const esc = (value) => String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash = (value) => Array.from(String(value)).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const quip = (service) => {
  const options = QUIPS[service.status.state] || QUIPS.unknown;
  return options[hash(service.id + service.status.state) % options.length];
};

function relativeTime(iso) {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

function updateRefreshAge() {
  if (data && !stale) el('last-refresh').textContent = `Last refresh: ${humanize(data.timestamp || data.generatedAt)}`;
  checkStale();
}

function checkStale() {
  const overlay = el('stale-overlay');
  if (!data || dismissed) {
    overlay.hidden = true;
    return;
  }
  const age = Date.now() - Date.parse(data.timestamp || data.generatedAt || '');
  if (!Number.isFinite(age) || age <= STALE_MS) {
    overlay.hidden = true;
    return;
  }
  el('stale-detail').textContent = `No publisher update for ${humanize(data.timestamp || data.generatedAt)}. Everything below is history, not live status.`;
  overlay.hidden = false;
}

function renderHero() {
  const services = data.services;
  const { score, level } = threat(services);
  const counts = services.reduce((acc, s) => {
    acc[s.status.state] = (acc[s.status.state] || 0) + 1;
    return acc;
  }, {});
  el('verdict').textContent = level.verdict;
  el('hero-sub').textContent = 'Public status feeds, summarized. Republished every 15 minutes.';
  el('alert-caption').textContent = `LEVEL ${level.n} · ${level.label}`;
  el('alert-scale').innerHTML = LEVELS.map((l) => `
    <div class="level ${l.n === level.n ? 'on' : ''}" style="--level-color:${l.color}">
      <b>${l.n}</b><small>${l.caption}</small>
    </div>
  `).join('');
  el('summary').textContent = `${services.length} services checked · ${counts.ok || 0} clean · ${counts.sus || 0} degraded · ${counts.cooked || 0} critical · ${counts.meltdown || 0} major · ${counts.maintenance || 0} planned · ${counts.unknown || 0} unreadable · impact ${score}.`;
  el('last-refresh').textContent = `Last refresh: ${humanize(data.timestamp || data.generatedAt)}`;
}

function renderTicker() {
  const hot = data.services.filter((s) => ['sus', 'cooked', 'meltdown', 'maintenance'].includes(s.status.state) && s.status.detail);
  const node = el('ticker-text');
  if (!hot.length) {
    node.className = 'ticker-text';
    node.textContent = 'No active incidents in the latest snapshot. This is not a security claim.';
    return;
  }
  const line = hot.map((s) => `${esc(s.name)}: ${esc(s.status.detail)}`).join('  ·  ');
  node.className = 'ticker-text hot';
  node.innerHTML = `${line} &nbsp;✦&nbsp; ${line}`;
}

function visibleServices() {
  return data.services.filter((s) => {
    if (category !== 'All' && s.category !== category) return false;
    if (stateFilter !== 'All' && s.status.state !== stateFilter) return false;
    if (query && !`${s.name} ${s.category} ${s.status.detail}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

function renderSections() {
  const services = visibleServices();
  const root = el('sections');
  if (!services.length) {
    root.innerHTML = '<div class="empty">No services match that filter.</div>';
    return;
  }
  const categories = [...new Set(services.map((s) => s.category))];
  root.innerHTML = categories.map((name) => {
    const items = services.filter((s) => s.category === name);
    return `<div class="section-head"><h2>${esc(name)}</h2><span>${items.length} services</span></div>
      <div class="grid">${items.map((s) => {
        const meta = STATES[s.status.state] || STATES.unknown;
        const goodAge = Date.now() - Date.parse(s.lastGoodFetchAt || '');
        const oldGood = Number.isFinite(goodAge) && goodAge > LAST_GOOD_OLD_MS;
        const stamp = oldGood
          ? `<span class="source-tag last-good">LAST GOOD ${esc(humanize(s.lastGoodFetchAt))}</span>`
          : `<span class="source-tag">${s.stale ? 'STALE' : 'SNAPSHOT'} · ${esc(relativeTime(s.fetchedAt))}</span>`;
        return `<a class="card ${s.stale || oldGood ? 'stale' : ''}" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" style="--state-color:${meta.color}">
          <div class="card-top"><span class="card-name"><span class="weight" title="impact weight ${esc(s.weight)}">${esc(s.weight)}</span><h3>${esc(s.name)}</h3></span><span class="pill">${esc(meta.label)}</span></div>
          <p class="quip">${esc(quip(s))}</p>
          <p class="detail">${esc(s.status.detail || 'No detail available.')}</p>
          <div class="card-foot">${stamp}<span>status page ↗</span></div>
        </a>`;
      }).join('')}</div>`;
  }).join('');
}

function renderFilters() {
  const cats = ['All', ...new Set(data.services.map((s) => s.category))];
  el('category-filters').innerHTML = cats.map((name) => `<button class="chip ${category === name ? 'active' : ''}" data-cat="${esc(name)}">${esc(name)}</button>`).join('');
  const states = ['All', 'ok', 'sus', 'cooked', 'meltdown', 'maintenance', 'unknown'];
  el('state-filters').innerHTML = states.map((name) => `<button class="chip ${stateFilter === name ? 'active' : ''}" data-state="${name}">${name === 'All' ? 'all states' : STATES[name].label}</button>`).join('');
}

function renderAll() {
  if (!data) return;
  renderHero();
  renderTicker();
  renderFilters();
  renderSections();
  checkStale();
}

async function loadSnapshot() {
  if (loading) return;
  loading = true;
  const button = el('refresh');
  button.disabled = true;
  button.textContent = 'checking…';
  try {
    const url = new URL(STATUS_URL, location.href);
    url.searchParams.set('_', String(Date.now()));
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
    stale = false;
    renderAll();
  } catch (error) {
    if (!data) {
      el('verdict').textContent = 'No snapshot available.';
      el('hero-sub').textContent = `Could not load the published JSON: ${error.message}`;
      el('ticker-text').textContent = 'Check STATUS_JSON_URL in index.html.';
      el('last-refresh').textContent = 'Last refresh: unavailable';
    } else {
      stale = true;
      el('last-refresh').textContent = `Last refresh: ${humanize(data.timestamp || data.generatedAt)} (stale copy)`;
    }
  } finally {
    loading = false;
    button.disabled = false;
    button.textContent = '↻ refresh';
  }
}

el('refresh').addEventListener('click', loadSnapshot);
el('stale-dismiss').addEventListener('click', () => {
  dismissed = true;
  el('stale-overlay').hidden = true;
});
el('search').addEventListener('input', (event) => {
  query = event.target.value.trim().toLowerCase();
  renderSections();
});
el('category-filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-cat]');
  if (!button) return;
  category = button.dataset.cat;
  renderFilters();
  renderSections();
});
el('state-filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-state]');
  if (!button) return;
  stateFilter = button.dataset.state;
  renderFilters();
  renderSections();
});
setInterval(loadSnapshot, 120000);
setInterval(updateRefreshAge, 30000);

loadSnapshot();
