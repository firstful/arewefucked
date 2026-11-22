import { STATES } from './normalize.js';
import { WEIGHT_SCORE, IMPACT, LEVELS, threat, humanize, relativeTime, SEVERITY, groupIncidents, functionalPercent, botStatusFor } from './logic.js';

const META_URL = document.querySelector('meta[name="status-json"]')?.content || './data/status.json';
const STATUS_URL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? './data/status.json' : META_URL;
const STALE_MS = 30 * 60 * 1000;
const LAST_GOOD_OLD_MS = 30 * 60 * 1000;

const FALLBACKS = {
  ok: ['quiet.', 'no issues reported.', 'boring. in a good way.', 'all clear here.', 'nothing to see.', 'green across the board.', 'sleeping nicely.', 'vibing.', 'status page is chill.', 'zero drama here.', 'all systems normal.', 'no notes.', 'calm, suspiciously.', 'clean sheet.', 'nothing cooking.', 'fine. actually fine.', 'no complaints filed.', 'smooth sailing.', 'ordinary day.', 'boring. thankfully.'],
  maintenance: ['planned downtime.', 'scheduled. not a surprise.', 'maintenance window. fine.', 'on the calendar.', 'expected interruptions.', 'keeping it tidy.', 'routine work.', 'someone is fixing something.', 'planned, not broken.', 'brief nap incoming.', 'scheduled wobble.', 'admin housekeeping.', 'booked in advance.', 'maintenance mode.', 'no panic, just plumbing.', 'planned pause.', 'holding pattern.', "upgrade o'clock.", 'they meant to do this.', 'maintenance, not mayhem.'],
  sus: ['something is off.', 'degraded, but upright.', 'watching it.', 'minor trouble reported.', 'a little wobbly.', 'not perfect, still up.', 'mild concern.', 'slower than usual.', 'issues noted.', 'some users will feel this.', 'shaky but alive.', 'under observation.', 'not a great look.', 'slight turbulence.', 'limping along.', 'partly cooked.', 'getting complaints.', 'noticeable hiccup.', 'bumpy, not fatal.', 'keep an eye on it.'],
  cooked: ['this one is hurting.', 'a real incident, not vibes.', 'outage. sorry.', 'yep, that is broken.', 'properly cooked.', 'not looking good.', 'users are noticing.', 'this is a bad one.', 'service is struggling.', 'incident confirmed.', 'ouch.', 'actively failing.', 'hard downtime.', 'logs are crying.', 'not a drill.', 'currently cooked.', 'significant trouble.', 'somebody is on call.', 'this hurts.', 'red alert energy.'],
  meltdown: ['major incident. no notes.', 'this is the bad one.', 'very not fine. click through.', 'critical.', 'full meltdown.', 'everything is on fire.', 'worst case, basically.', 'escalate immediately.', 'major outage.', 'this is the one.', 'oh no. actually oh no.', 'catastrophic vibes.', 'not survivable gracefully.', 'big red button territory.', 'everyone is awake now.', 'severe and ongoing.', 'straight up cooked.', 'the bad bad.', 'incident commander energy.', 'this is why we have pagers.'],
  unknown: ['no readable feed.', 'status page unavailable.', 'no data. not assuming the worst.', 'signal lost.', 'feed went quiet.', 'cannot verify.', 'no answer from the page.', 'status page is missing.', 'blank chart energy.', 'we are flying blind here.', 'nothing to parse.', 'feed hiccup.', 'no signal, no verdict.', 'unreachable.', 'not enough information.', 'page gave us nothing.', 'cant read it.', 'mystery mode.', 'no feed, no claim.', 'checking back later.'],
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

function updateRefreshAge() {
  if (data && !stale) el('last-refresh').textContent = `Last refresh: ${humanize(data.timestamp || data.generatedAt)}`;
  checkStale();
}

function checkStale() {
  const overlay = el('stale-overlay');
  if (!data || dismissed) { overlay.hidden = true; return; }
  const age = Date.now() - Date.parse(data.timestamp || data.generatedAt || '');
  if (!Number.isFinite(age) || age <= STALE_MS) { overlay.hidden = true; return; }
  el('stale-detail').textContent = `No publisher update for ${humanize(data.timestamp || data.generatedAt)}. Everything below is history, not live status.`;
  overlay.hidden = false;
}

function updateClock() {
  const now = new Date();
  const clock = el('clock');
  const date = el('date');
  if (clock) clock.textContent = now.toLocaleTimeString('en-US', { hour12: false });
  if (date) date.textContent = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
}
setInterval(updateClock, 1000);
updateClock();

function renderHero() {
  const services = data.services;
  const { score, level } = threat(services);
  const counts = services.reduce((acc, s) => { acc[s.status.state] = (acc[s.status.state] || 0) + 1; return acc; }, {});
  el('hero')?.style && (el('hero').style.setProperty('--level-color', level.color));
  if (el('verdict')) el('verdict').textContent = data.headline?.text || level.verdict;
  if (el('hero-sub')) el('hero-sub').textContent = 'Public status feeds, summarized. Republished every 15 minutes.';
  if (el('alert-caption')) el('alert-caption').textContent = `LEVEL ${level.n} · ${data.headline?.levelCaption || level.caption}`;
  if (el('summary')) el('summary').textContent = `${services.length} services checked · ${counts.ok || 0} clean · ${counts.sus || 0} degraded · ${counts.cooked || 0} outage · ${counts.meltdown || 0} major · ${counts.maintenance || 0} planned · ${counts.unknown || 0} unreadable · impact ${score}.`;
  if (el('last-refresh')) el('last-refresh').textContent = `Last refresh: ${humanize(data.timestamp || data.generatedAt)}`;
  // overall status %
  const pct = functionalPercent(level);
  if (el('overall-pct')) el('overall-pct').textContent = `${pct}%`;
  if (el('overall-sub')) el('overall-sub').textContent = pct < 30 ? 'PREPARE FOR INTERNET CHAOS' : pct < 60 ? 'DEGRADED BUT HOLDING' : 'SYSTEMS MOSTLY ONLINE';
  if (el('overall-pct')) el('overall-pct').style.color = level.color;
  // threat level
  if (el('threat-level')) { el('threat-level').textContent = level.caption; el('threat-level').style.color = level.color; }
  if (el('threat-icons')) el('threat-icons').textContent = level.threatIcons;
  if (el('bot-status')) {
    const bs = el('bot-status');
    bs.textContent = botStatusFor(level);
    bs.className = 'bot-status' + (level.n <= 2 ? ' danger' : level.n === 3 ? ' warn' : '');
  }
  if (el('svc-count')) el('svc-count').textContent = `${services.length} services`;
}

function renderTicker() {
  const hot = data.services.filter((s) => ['sus', 'cooked', 'meltdown', 'maintenance'].includes(s.status.state) && s.status.detail);
  const node = el('ticker-text');
  if (!hot.length) { node.className = 'ticker-text'; node.textContent = 'No active incidents in the latest snapshot. This is not a security claim.'; return; }
  const line = hot.map((s) => `${esc(s.name)}: ${esc(s.status.detail)}`).join('  ·  ');
  node.className = 'ticker-text hot';
  node.innerHTML = `${line} &nbsp;✦&nbsp; ${line}`;
}

function renderServicesTable() {
  const root = el('services-table');
  if (!root) return;
  const services = [...data.services].sort((a, b) => (SEVERITY[b.status.state] || 0) - (SEVERITY[a.status.state] || 0) || (WEIGHT_SCORE[b.weight] || 2) - (WEIGHT_SCORE[a.weight] || 2));
  const top = services.slice(0, 14);
  root.innerHTML = top.map((s) => {
    const meta = STATES[s.status.state] || STATES.unknown;
    const barWidth = Math.min(100, (WEIGHT_SCORE[s.weight] || 2) * 18 + (SEVERITY[s.status.state] || 0) * 8);
    return `<div class="svc-row">
      <span class="svc-name">${esc(s.name)}</span>
      <span class="svc-status" style="color:${meta.color}">${esc(meta.label)}</span>
      <span class="svc-detail">${esc(s.status.detail || '')}</span>
      <span class="svc-bar"><span style="width:${barWidth}%"></span></span>
    </div>`;
  }).join('');
}

function visibleServices() {
  return data.services.filter((s) => {
    if (!query) return (new Set(['sus', 'cooked', 'meltdown'])).has(s.status.state);
    return `${s.name} ${s.category} ${s.status.detail}`.toLowerCase().includes(query);
  });
}

function renderSections() {
  const services = visibleServices();
  const root = el('sections');
  if (!services.length) { root.innerHTML = '<div class="empty">No services match that filter.</div>'; return; }
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
  if (!active.length) { feed.hidden = true; return; }
  feed.hidden = false;
  const groupList = groupIncidents(active);
  el('incident-count').textContent = `${groupList.length} live`;
  el('incidents').innerHTML = groupList.slice(0, 12).map((g) => {
    const meta = STATES[g.state] || STATES.unknown;
    const summary = quip({ id: g.provider, status: { state: g.state } }, g.summary);
    const titles = g.items.length > 1
      ? `<ul class="incident-titles">${g.items.map((i) => `<li>${esc(i.title)}</li>`).join('')}</ul>`
      : `<p class="incident-title">${esc(g.items[0].title)}</p>`;
    const body = `<span class="incident-top"><span class="incident-service">${esc(g.provider)}</span><span class="pill" style="--state-color:${meta.color}">${esc(meta.label)}</span></span>
      ${titles}
      <p class="incident-summary">${esc(summary)}</p>
      <span class="incident-meta">${esc(g.items[0].weight)} · ${g.items.length} incident${g.items.length === 1 ? '' : 's'} · ongoing since ${esc(relativeTime(g.detectedAt))}</span>`;
    return g.url
      ? `<a class="incident-card" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer" style="--state-color:${meta.color}">${body}</a>`
      : `<div class="incident-card" style="--state-color:${meta.color}">${body}</div>`;
  }).join('');
  // recent events log
  const eventsRoot = el('recent-events');
  if (eventsRoot) {
    const lines = groupList.slice(0, 8).map((g) => {
      const t = new Date(g.detectedAt || data.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      return `<div class="event-line"><span class="event-time">${esc(t)}</span><span class="event-text">${esc(g.provider)} — ${esc(g.items[0].title)}</span></div>`;
    });
    eventsRoot.innerHTML = lines.join('') || '<div class="event-line"><span class="event-text">No recent events.</span></div>';
  }
}

function renderAll() {
  if (!data) return;
  renderHero();
  renderTicker();
  renderServicesTable();
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
      if (el('verdict')) el('verdict').textContent = 'No snapshot available.';
      if (el('hero-sub')) el('hero-sub').textContent = `Could not load the published JSON: ${error.message}`;
      if (el('ticker-text')) el('ticker-text').textContent = 'Check STATUS_JSON_URL in index.html.';
      if (el('last-refresh')) el('last-refresh').textContent = 'Last refresh: unavailable';
    } else {
      stale = true;
      if (el('last-refresh')) el('last-refresh').textContent = `Last refresh: ${humanize(data.timestamp || data.generatedAt)} (stale copy)`;
    }
  } finally {
    loading = false;
    button.disabled = false;
    button.textContent = '↻ refresh';
  }
}

el('refresh').addEventListener('click', loadSnapshot);
el('stale-dismiss').addEventListener('click', () => { dismissed = true; el('stale-overlay').hidden = true; });
el('search').addEventListener('input', (event) => { query = event.target.value.trim().toLowerCase(); renderSections(); });
setInterval(loadSnapshot, 120000);
setInterval(updateRefreshAge, 30000);

loadSnapshot();