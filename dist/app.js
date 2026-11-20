import { STATES } from './normalize.js';

const STATUS_URL = document.querySelector('meta[name="status-json"]')?.content || './data/status.json';
const RANK = { ok: 0, maintenance: 1, sus: 2, cooked: 3, meltdown: 4, unknown: 0 };
const LEVELS = [
  { n: 5, caption: 'NOMINAL', label: 'NOMINAL', color: '#5ee7a0', verdict: 'Nothing is on fire. For once.' },
  { n: 4, caption: 'ELEVATED', label: 'PLANNED / UNREADABLE', color: '#9aa7ff', verdict: 'Planned work or missing data. Nothing to panic about.' },
  { n: 3, caption: 'DEGRADED', label: 'DEGRADED', color: '#ffd166', verdict: 'A few services are off. Keep an eye on it.' },
  { n: 2, caption: 'CRITICAL', label: 'CRITICAL', color: '#ff9f5a', verdict: 'Yes, this is as bad as it looks.' },
  { n: 1, caption: 'MELTDOWN', label: 'MELTDOWN', color: '#ff5d7a', verdict: 'Several things are very, very not fine.' },
];
const LEVEL_FOR = { ok: 5, maintenance: 4, unknown: 4, sus: 3, cooked: 2, meltdown: 1 };
const QUIPS = {
  ok: ['quiet.', 'no issues reported.', 'boring. in a good way.', 'all clear here.'],
  maintenance: ['planned downtime.', 'scheduled. not a surprise.', 'maintenance window. fine.'],
  sus: ['something is off.', 'degraded, but upright.', 'watching it.', 'minor trouble reported.'],
  cooked: ['this one is hurting.', 'a real incident, not vibes.', 'outage. sorry.', 'yep, that is broken.'],
  meltdown: ['major incident. no notes.', 'this is the bad one.', 'very not fine. click through.', 'critical.'],
  unknown: ['no readable feed.', 'status page unavailable.', 'no data. not assuming the worst.'],
};

let data = null;
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

function worstState(services) {
  return services.map((s) => s.status.state).sort((a, b) => (RANK[b] || 0) - (RANK[a] || 0))[0] || 'unknown';
}

function relativeTime(iso) {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

function renderHero() {
  const services = data.services;
  const worst = worstState(services);
  const level = LEVELS.find((l) => l.n === LEVEL_FOR[worst]) || LEVELS[1];
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
  el('summary').textContent = `${services.length} services checked · ${counts.ok || 0} clean · ${counts.sus || 0} degraded · ${counts.cooked || 0} critical · ${counts.meltdown || 0} major · ${counts.maintenance || 0} planned · ${counts.unknown || 0} unreadable.`;
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
        return `<a class="card" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" style="--state-color:${meta.color}">
          <div class="card-top"><h3>${esc(s.name)}</h3><span class="pill">${esc(meta.label)}</span></div>
          <p class="quip">${esc(quip(s))}</p>
          <p class="detail">${esc(s.status.detail || 'No detail available.')}</p>
          <div class="card-foot"><span class="source-tag">SNAPSHOT · ${esc(relativeTime(s.fetchedAt))}</span><span>status page ↗</span></div>
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
    el('scan-time').textContent = `snapshot ${new Date(data.generatedAt).toLocaleTimeString()}`;
    renderAll();
  } catch (error) {
    if (!data) {
      el('verdict').textContent = 'we broke the meter 💀';
      el('hero-sub').textContent = `Could not load the published JSON: ${error.message}`;
      el('ticker-text').textContent = 'Check STATUS_JSON_URL in index.html.';
    } else {
      el('scan-time').textContent = 'snapshot unavailable · showing last copy';
    }
  } finally {
    loading = false;
    button.disabled = false;
    button.textContent = '↻ refresh';
  }
}

el('refresh').addEventListener('click', loadSnapshot);
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

loadSnapshot();
