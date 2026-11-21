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
const FALLBACKS = {
  ok: [
    'quiet.', 'no issues reported.', 'boring. in a good way.', 'all clear here.',
    'nothing to see.', 'green across the board.', 'sleeping nicely.', 'vibing.',
    'status page is chill.', 'zero drama detected.', 'all systems normal.', 'no notes.',
    'calm, suspiciously.', 'clean sheet.', 'nothing cooking.', 'fine. actually fine.',
    'no complaints filed.', 'smooth sailing.', 'ordinary day.', 'boring. thankfully.',
  ],
  maintenance: [
    'planned downtime.', 'scheduled. not a surprise.', 'maintenance window. fine.',
    'on the calendar.', 'expected interruptions.', 'keeping it tidy.', 'routine work.',
    'someone is fixing something.', 'planned, not broken.', 'brief nap incoming.',
    'scheduled wobble.', 'admin housekeeping.', 'booked in advance.', 'maintenance mode.',
    'no panic, just plumbing.', 'planned pause.', 'holding pattern.', "upgrade o'clock.",
    'they meant to do this.', 'maintenance, not mayhem.',
  ],
  sus: [
    'something is off.', 'degraded, but upright.', 'watching it.', 'minor trouble reported.',
    'a little wobbly.', 'not perfect, still up.', 'mild concern.', 'slower than usual.',
    'issues noted.', 'some users will feel this.', 'shaky but alive.', 'under observation.',
    'not a great look.', 'slight turbulence.', 'limping along.', 'partly cooked.',
    'getting complaints.', 'noticeable hiccup.', 'bumpy, not fatal.', 'keep an eye on it.',
  ],
  cooked: [
    'this one is hurting.', 'a real incident, not vibes.', 'outage. sorry.', 'yep, that is broken.',
    'properly cooked.', 'not looking good.', 'users are noticing.', 'this is a bad one.',
    'service is struggling.', 'incident confirmed.', 'ouch.', 'actively failing.',
    'hard downtime.', 'logs are crying.', 'not a drill.', 'currently cooked.',
    'significant trouble.', 'somebody is on call.', 'this hurts.', 'red alert energy.',
  ],
  meltdown: [
    'major incident. no notes.', 'this is the bad one.', 'very not fine. click through.', 'critical.',
    'full meltdown.', 'everything is on fire.', 'worst case, basically.', 'escalate immediately.',
    'major outage.', 'this is the one.', 'oh no. actually oh no.', 'catastrophic vibes.',
    'not survivable gracefully.', 'big red button territory.', 'everyone is awake now.',
    'severe and ongoing.', 'straight up cooked.', 'the bad bad.', 'incident commander energy.',
    'this is why we have pagers.',
  ],
  unknown: [
    'no readable feed.', 'status page unavailable.', 'no data. not assuming the worst.',
    'signal lost.', 'feed went quiet.', 'cannot verify.', 'no answer from the page.',
    'status page is missing.', 'blank chart energy.', 'we are flying blind here.',
    'nothing to parse.', 'feed hiccup.', 'no signal, no verdict.', 'unreachable.',
    'not enough information.', 'page gave us nothing.', 'cant read it.', 'mystery mode.',
    'no feed, no claim.', 'checking back later.',
  ],
};

let data = null;
let stale = false;
let dismissed = false;
let loading = false;
let query = '';

const el = (id) => document.getElementById(id);
const esc = (value) => String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash = (value) => Array.from(String(value)).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const quip = (service, summary) => {
  if (summary) return String(summary).slice(0, 260);
  const options = FALLBACKS[service.status?.state] || FALLBACKS.unknown;
  const seed = `${service.id}|${service.status?.state || 'unknown'}|${data?.timestamp || ''}`;
  return options[hash(seed) % options.length];
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
  const fill = { 5: 12, 4: 34, 3: 56, 2: 78, 1: 100 }[level.n] || 20;
  el('hero').style.setProperty('--level-color', level.color);
  el('verdict').textContent = data.headline?.text || level.verdict;
  el('hero-sub').textContent = 'Public status feeds, summarized. Republished every 15 minutes.';
  el('alert-caption').textContent = `LEVEL ${level.n} · ${level.label}`;
  el('thermo-fill').style.height = `${fill}%`;
  el('thermo-level').textContent = level.n;
  el('thermo-markers').innerHTML = LEVELS.map((l) => `
    <span class="${l.n === level.n ? 'on' : ''}" style="--level-color:${l.color}">${l.n}</span>
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

const SEVERITY = { ok: 0, unknown: 1, maintenance: 2, sus: 3, cooked: 4, meltdown: 5 };
const TROUBLE = new Set(['sus', 'cooked', 'meltdown']);

function visibleServices() {
  return data.services.filter((s) => {
    if (!query) return TROUBLE.has(s.status.state);
    return `${s.name} ${s.category} ${s.status.detail}`.toLowerCase().includes(query);
  });
}

function renderSections() {
  const services = visibleServices();
  const root = el('sections');
  if (!services.length) {
    root.innerHTML = '<div class="empty">No services match that filter.</div>';
    return;
  }
  const rank = (s) => SEVERITY[s.status.state] || 0;
  const weightRank = (s) => WEIGHT_SCORE[s.weight] || 2;
  const categories = [...new Set(services.map((s) => s.category))].sort((a, b) => {
    const groupA = services.filter((s) => s.category === a);
    const groupB = services.filter((s) => s.category === b);
    return Math.max(...groupB.map(rank)) - Math.max(...groupA.map(rank)) || a.localeCompare(b);
  });
  root.innerHTML = categories.map((name) => {
    const items = services.filter((s) => s.category === name)
      .sort((a, b) => rank(b) - rank(a) || weightRank(b) - weightRank(a) || a.name.localeCompare(b.name));
    return `<div class="section-head"><h2>${esc(name)}</h2><span>${items.length} services</span></div>
      <div class="grid">${items.map((s) => {
        const meta = STATES[s.status.state] || STATES.unknown;
        const goodAge = Date.now() - Date.parse(s.lastGoodFetchAt || '');
        const oldGood = Number.isFinite(goodAge) && goodAge > LAST_GOOD_OLD_MS;
        const liveIncident = (data.incidents || []).find((i) => !i.resolvedAt && i.summary && (s.status.incidents || []).some((si) => si.id === i.id));
        const stamp = oldGood
          ? `<span class="source-tag last-good">LAST GOOD ${esc(humanize(s.lastGoodFetchAt))}</span>`
          : `<span class="source-tag">${s.stale ? 'STALE' : 'SNAPSHOT'} · ${esc(relativeTime(s.fetchedAt))}</span>`;
        return `<a class="card ${s.stale || oldGood ? 'stale' : ''}" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" style="--state-color:${meta.color}">
          <div class="card-top"><span class="card-name"><span class="weight" title="impact weight ${esc(s.weight)}">${esc(s.weight)}</span><h3>${esc(s.name)}</h3></span><span class="pill">${esc(meta.label)}</span></div>
          <p class="quip">${esc(quip(s, liveIncident?.summary))}</p>
          <p class="detail">${esc(s.status.detail || 'No detail available.')}</p>
          <div class="card-foot">${stamp}<span>status page ↗</span></div>
        </a>`;
      }).join('')}</div>`;
  }).join('');
}

function renderIncidents() {
  const feed = el('incident-feed');
  const active = (data.incidents || []).filter((i) => !i.resolvedAt);
  if (!active.length) {
    feed.hidden = true;
    return;
  }
  feed.hidden = false;
  el('incident-count').textContent = `${active.length} live`;
  el('incidents').innerHTML = active.slice(0, 12).map((i) => {
    const meta = STATES[i.state] || STATES.unknown;
    const summary = quip({ id: i.id, status: { state: i.state } }, i.summary);
    const body = `<span class="incident-top"><span class="incident-service">${esc(i.serviceName)}</span><span class="pill" style="--state-color:${meta.color}">${esc(meta.label)}</span></span>
      <p class="incident-title">${esc(i.title)}</p>
      <p class="incident-summary">${esc(summary)}</p>
      <span class="incident-meta">${esc(i.weight)} · detected ${esc(relativeTime(i.detectedAt))}</span>`;
    return i.url
      ? `<a class="incident-card" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer" style="--state-color:${meta.color}">${body}</a>`
      : `<div class="incident-card" style="--state-color:${meta.color}">${body}</div>`;
  }).join('');
}

function renderAll() {
  if (!data) return;
  renderHero();
  renderTicker();
  renderIncidents();
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
setInterval(loadSnapshot, 120000);
setInterval(updateRefreshAge, 30000);

loadSnapshot();
