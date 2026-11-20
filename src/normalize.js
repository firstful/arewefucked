// Shared normalizer: runs in Node (build) and in the browser (live refresh).
// Input: raw payload from a status source. Output: one tidy, comparable shape.

const STATE_RANK = { ok: 0, maintenance: 1, sus: 2, cooked: 3, meltdown: 4, unknown: 0 };

export const STATES = {
  ok: { label: 'NOMINAL', emoji: '😌', color: '#5ee7a0' },
  maintenance: { label: 'PLANNED', emoji: '🧘', color: '#9aa7ff' },
  sus: { label: 'DEGRADED', emoji: '👀', color: '#ffd166' },
  cooked: { label: 'CRITICAL', emoji: '🔥', color: '#ff9f5a' },
  meltdown: { label: 'MAJOR', emoji: '💀', color: '#ff5d7a' },
  unknown: { label: 'NO FEED', emoji: '📡', color: '#7b8494' },
};

const INDICATOR = {
  none: 'ok',
  maintenance: 'maintenance',
  minor: 'sus',
  major: 'cooked',
  critical: 'meltdown',
};

const COMPONENT = {
  operational: 'ok',
  under_maintenance: 'maintenance',
  degraded_performance: 'sus',
  partial_outage: 'cooked',
  major_outage: 'meltdown',
};

const IMPACT = {
  none: 'maintenance',
  minor: 'sus',
  major: 'cooked',
  critical: 'meltdown',
};

function worst(...states) {
  return states.filter(Boolean).sort((a, b) => (STATE_RANK[b] || 0) - (STATE_RANK[a] || 0))[0] || 'ok';
}

function matches(text, filter) {
  if (!filter) return true;
  try {
    return new RegExp(filter, 'i').test(String(text || ''));
  } catch {
    return false;
  }
}

function clean(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, name) {
  const found = String(block).match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return found ? clean(found[1]) : '';
}

function blocks(xml, name) {
  return Array.from(String(xml).matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'gi')), (m) => m[1]);
}

function recent(date, now, days) {
  const time = Date.parse(date || '');
  return Number.isFinite(time) && now - time <= days * 86400000 && now - time >= -21 * 86400000;
}

function result(state, detail, incidents = []) {
  return {
    state,
    detail: String(detail || '').slice(0, 220),
    incidents: incidents.slice(0, 5).map((item) => ({
      title: String(item.title || '').slice(0, 180),
      url: item.url || '',
    })),
  };
}

function statuspage(raw, source, now) {
  if (!raw || typeof raw !== 'object') return result('unknown', 'Could not read the status feed.');
  const filter = source.filter;
  let incidents = (raw.incidents || []).filter((i) => !/^(resolved|postmortem|completed)$/i.test(i.status || ''));
  let components = (raw.components || []).filter((c) => c.status && c.status !== 'operational');

  if (filter) {
    components = components.filter((c) => matches(c.name, filter));
    incidents = incidents.filter((i) => matches(i.name, filter));
    if (!components.length && !incidents.length) {
      return result('ok', 'Quiet in this lane.', []);
    }
  }

  const states = [
    filter ? null : INDICATOR[raw.status?.indicator],
    ...components.map((c) => COMPONENT[c.status] || 'sus'),
    ...incidents.map((i) => {
      if (/maintenance|scheduled/i.test(i.status || '')) return 'maintenance';
      // Statuspage uses impact "none" for active, low-severity incidents too.
      return i.impact && i.impact !== 'none' ? IMPACT[i.impact] || 'sus' : 'sus';
    }),
  ];
  const state = worst(...states);
  const first = incidents[0] || components[0];
  const detail = first?.name || raw.status?.description || 'All systems reporting in.';
  return result(state === 'ok' && !filter ? INDICATOR[raw.status?.indicator] || 'ok' : state, detail, incidents.map((i) => ({ title: i.name, url: i.shortlink })));
}

function aws(raw, source, now) {
  const items = blocks(raw, 'item')
    .filter((item) => recent(tag(item, 'pubDate'), now, 7))
    .filter((item) => !/resolved/i.test(`${tag(item, 'title')} ${tag(item, 'description')}`))
    .filter((item) => matches(`${tag(item, 'title')} ${tag(item, 'description')}`, source.filter));
  if (!items.length) return result('ok', 'No fresh AWS drama in the feed.');
  const incidents = items.map((item) => ({ title: tag(item, 'title'), url: tag(item, 'link') }));
  const text = items.map((item) => `${tag(item, 'title')} ${tag(item, 'description')}`).join(' ');
  const state = /disruption|outage|unavailable/i.test(text) ? 'cooked' : 'sus';
  return result(state, tag(items[0], 'title'), incidents);
}

function gcp(raw, source, now) {
  if (!Array.isArray(raw)) return result('unknown', 'Could not read the GCP feed.');
  const active = raw
    .filter((i) => !i.end || Date.parse(i.end) > now)
    .filter((i) => matches(`${i.service_name} ${i.external_desc} ${(i.affected_products || []).map((p) => p.title || p).join(' ')}`, source.filter));
  if (!active.length) return result('ok', 'GCP is giving nothing to gossip about.');
  const severity = active.map((i) => String(i.severity || 'SEV4')).sort()[0];
  const state = /SEV[01]/i.test(severity) ? 'meltdown' : /SEV2/i.test(severity) ? 'cooked' : 'sus';
  return result(state, active[0].external_desc || active[0].service_name, active.map((i) => ({ title: i.external_desc || i.service_name, url: i.uri })));
}

function azure(raw, source, now) {
  const items = blocks(raw, 'item')
    .filter((item) => recent(tag(item, 'pubDate'), now, 7))
    .filter((item) => matches(`${tag(item, 'title')} ${tag(item, 'description')}`, source.filter));
  if (!items.length) return result('ok', 'Azure only yelling about widespread stuff anyway.');
  const incidents = items.map((item) => ({ title: tag(item, 'title'), url: tag(item, 'link') }));
  return result(/critical|outage|down/i.test(incidents[0].title) ? 'cooked' : 'sus', incidents[0].title, incidents);
}

function hetzner(raw) {
  const found = String(raw).match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!found) return result('unknown', 'Could not read the Hetzner page.');
  let data;
  try {
    data = JSON.parse(found[1]);
  } catch {
    return result('unknown', 'Could not parse the Hetzner page.');
  }
  const groups = data?.props?.pageProps?.incidents || {};
  const open = Object.values(groups).flat().filter((i) => i && !/resolved|closed/i.test(String(i.state || '')));
  if (!open.length) return result('ok', 'Hetzner servers are vibing.');
  const title = open[0].titleEn || open[0].titleDe || open[0].descriptionEn || 'Hetzner incident';
  return result(/outage|major/i.test(title) ? 'cooked' : 'sus', clean(title), open.slice(0, 5).map((i) => ({ title: clean(i.titleEn || i.titleDe || i.descriptionEn || 'Incident') })));
}

function feed(raw, source, now, kind) {
  const isAtom = kind === 'atom';
  const entries = blocks(raw, isAtom ? 'entry' : 'item');
  const fresh = entries.filter((block) => {
    const date = isAtom ? tag(block, 'published') : tag(block, 'pubDate');
    return recent(date, now, 14);
  });
  const meaningful = fresh.filter((block) => {
    const title = tag(block, 'title');
    const content = tag(block, 'content') || tag(block, 'description') || tag(block, 'encoded');
    if (/scheduled maintenance/i.test(title)) return true;
    return !/resolved|mitigated|restored/i.test(`${title} ${content}`);
  });
  if (!meaningful.length) return result('ok', 'No active incidents on the wire.');
  const titles = meaningful.map((block) => tag(block, 'title'));
  const state = titles.some((t) => /scheduled maintenance/i.test(t)) ? 'maintenance' : 'sus';
  return result(state, titles[0], titles.map((title) => ({ title })));
}

function dodo(raw) {
  const state = String(raw?.status || '').toLowerCase();
  if (state === 'ok') return result('ok', 'Dodo says everything is fine.');
  return result(state ? 'sus' : 'unknown', state || 'Could not read the status feed.');
}

export function normalize(source, raw, now = Date.now()) {
  try {
    switch (source.type) {
      case 'statuspage': return statuspage(raw, source, now);
      case 'aws': return aws(raw, source, now);
      case 'gcp': return gcp(raw, source, now);
      case 'azure': return azure(raw, source, now);
      case 'hetzner': return hetzner(raw);
      case 'atom': return feed(raw, source, now, 'atom');
      case 'rss': return feed(raw, source, now, 'rss');
      case 'dodo': return dodo(raw);
      default: return result('unknown', 'No public status feed we can read.');
    }
  } catch (error) {
    return result('unknown', `Feed hiccup: ${String(error?.message || error).slice(0, 80)}`);
  }
}
