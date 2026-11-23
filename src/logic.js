// Pure logic shared by the browser (public/app.js), the publisher (scripts/*), and tests.
// No DOM, no fetch — safe to import in Node and the browser.

export const WEIGHT_SCORE = { S: 1, M: 2, L: 3, XL: 4, XXL: 5 };
export const IMPACT = { ok: 0, maintenance: 0.5, sus: 1, cooked: 2, meltdown: 3, unknown: 0 };

export const LEVELS = [
  { n: 5, caption: 'NOMINAL', label: 'NOMINAL', color: '#39ff14', verdict: 'Nothing is on fire. For once.', bot: 'All systems nominal. Standing by.', threatIcons: '' },
  { n: 4, caption: 'ELEVATED', label: 'PLANNED / UNREADABLE', color: '#9aa7ff', verdict: 'Planned work or missing data. Nothing to panic about.', bot: 'Minor anomalies detected. Monitoring.', threatIcons: '🟡' },
  { n: 3, caption: 'DEGRADED', label: 'DEGRADED', color: '#ffaa00', verdict: 'A few services are off. Keep an eye on it.', bot: 'Degraded but operational. Watching closely.', threatIcons: '🟠🟠' },
  { n: 2, caption: 'CRITICAL', label: 'CRITICAL', color: '#ff3355', verdict: 'Yes, this is as bad as it looks.', bot: 'In Control, Fear Not.', threatIcons: '🔴🔴🔴' },
  { n: 1, caption: 'MELTDOWN', label: 'MELTDOWN', color: '#ff3355', verdict: 'Several things are very, very not fine.', bot: 'Total chaos. Humans notified.', threatIcons: '💀💀💀💀' },
];

export const STATE_RANK = { ok: 0, maintenance: 1, sus: 2, cooked: 3, meltdown: 4, unknown: 0 };
export const SEVERITY = { ok: 0, unknown: 0, maintenance: 1, sus: 2, cooked: 3, meltdown: 4 };

export function threat(services) {
  const list = services || [];
  const score = list.reduce((sum, s) => sum + (IMPACT[s?.status?.state] || 0) * (WEIGHT_SCORE[s?.weight] || 2), 0);
  const meltdownCount = list.filter((s) => s?.status?.state === 'meltdown').length;
  const cookedCount = list.filter((s) => s?.status?.state === 'cooked').length;
  const susCount = list.filter((s) => s?.status?.state === 'sus').length;
  const majorMeltdown = list.some((s) => s?.status?.state === 'meltdown' && s?.weight === 'XXL');

  let n;
  if (score === 0) n = 5;
  else if (majorMeltdown && (meltdownCount >= 2 || score >= 30)) n = 1;
  else if (meltdownCount >= 1 && score >= 12) n = 2;
  else if (cookedCount >= 3) n = 2;
  else if (cookedCount >= 2 && score >= 20) n = 2;
  else if (score >= 6 || cookedCount >= 1) n = 3;
  else n = 4;
  return { score, level: LEVELS.find((l) => l.n === n), counts: { meltdown: meltdownCount, cooked: cookedCount, sus: susCount } };
}

export function humanize(iso) {
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

export function relativeTime(iso) {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

export function groupIncidents(active) {
  const groups = new Map();
  for (const i of active || []) {
    const key = i.provider || i.serviceName || i.serviceId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  return [...groups.entries()].map(([provider, items]) => {
    const state = items.reduce((worst, i) => ((STATE_RANK[i.state] || 0) > (STATE_RANK[worst] || 0) ? i.state : worst), items[0].state);
    const detectedAt = items.map((i) => i.detectedAt).filter(Boolean).sort()[0] || null;
    const lastSeen = items.reduce((m, i) => Math.max(m, Date.parse(i.lastSeenAt || 0)), 0);
    const summary = items.find((i) => i.summary)?.summary || null;
    const url = items.find((i) => i.url)?.url || items[0].url || '';
    return { provider, items, state, detectedAt, lastSeen, summary, url };
  }).sort((a, b) => b.lastSeen - a.lastSeen);
}

export function functionalPercent(services) {
  const list = services || [];
  if (!list.length) return 100;
  const totalWeight = list.reduce((s, x) => s + (WEIGHT_SCORE[x?.weight] || 2), 0) || 1;
  const okWeight = list.filter((x) => x?.status?.state === 'ok').reduce((s, x) => s + (WEIGHT_SCORE[x?.weight] || 2), 0);
  return Math.round((okWeight / totalWeight) * 100);
}

export function botStatusFor(level) {
  return (level && level.bot) ? level.bot : 'Standing by.';
}