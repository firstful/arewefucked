// Pure logic shared by the browser (public/app.js) and tests.
// No DOM, no fetch — safe to import in Node and the browser.

export const WEIGHT_SCORE = { S: 1, M: 2, L: 3, XL: 4, XXL: 5 };
export const IMPACT = { ok: 0, maintenance: 0.5, sus: 1, cooked: 2, meltdown: 3, unknown: 0 };
export const LEVELS = [
  { n: 5, caption: 'NOMINAL', label: 'NOMINAL', color: '#39ff14', verdict: 'Nothing is on fire. For once.', functional: 98, bot: 'All systems nominal. Standing by.', threatIcons: '' },
  { n: 4, caption: 'ELEVATED', label: 'PLANNED / UNREADABLE', color: '#9aa7ff', verdict: 'Planned work or missing data. Nothing to panic about.', functional: 72, bot: 'Minor anomalies detected. Monitoring.', threatIcons: '🟡' },
  { n: 3, caption: 'DEGRADED', label: 'DEGRADED', color: '#ffaa00', verdict: 'A few services are off. Keep an eye on it.', functional: 46, bot: 'Degraded but operational. Watching closely.', threatIcons: '🟠🟠' },
  { n: 2, caption: 'CRITICAL', label: 'CRITICAL', color: '#ff3355', verdict: 'Yes, this is as bad as it looks.', functional: 18, bot: 'In Control, Fear Not.', threatIcons: '🔴🔴🔴' },
  { n: 1, caption: 'MELTDOWN', label: 'MELTDOWN', color: '#ff3355', verdict: 'Several things are very, very not fine.', functional: 6, bot: 'Total chaos. Humans notified.', threatIcons: '💀💀💀💀' },
];

export function threat(services) {
  const score = (services || []).reduce((sum, s) => sum + (IMPACT[s?.status?.state] || 0) * (WEIGHT_SCORE[s?.weight] || 2), 0);
  const major = (services || []).some((s) => s?.status?.state === 'meltdown' && ['XL', 'XXL'].includes(s?.weight));
  const critical = (services || []).some((s) => s?.status?.state === 'cooked' && ['XL', 'XXL'].includes(s?.weight));
  const n = score >= 40 || major ? 1 : score >= 12 || critical ? 2 : score >= 4 ? 3 : score > 0 ? 4 : 5;
  return { score, level: LEVELS.find((l) => l.n === n) };
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

export const SEVERITY = { ok: 0, unknown: 0, maintenance: 1, sus: 2, cooked: 3, meltdown: 4 };

export function groupIncidents(active) {
  const groups = new Map();
  for (const i of active || []) {
    const key = i.provider || i.serviceName || i.serviceId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  return [...groups.entries()].map(([provider, items]) => {
    const state = items.reduce((worst, i) => ((SEVERITY[i.state] || 0) > (SEVERITY[worst] || 0) ? i.state : worst), items[0].state);
    // state severity uses STATE_RANK-like; but here use SEVERITY map which is 0..4. For state severity we need state rank. Use a local rank.
    const detectedAt = items.map((i) => i.detectedAt).filter(Boolean).sort()[0] || null;
    const lastSeen = items.reduce((m, i) => Math.max(m, Date.parse(i.lastSeenAt || 0)), 0);
    const summary = items.find((i) => i.summary)?.summary || null;
    const url = items.find((i) => i.url)?.url || items[0].url || '';
    return { provider, items, state, detectedAt, lastSeen, summary, url };
  }).sort((a, b) => b.lastSeen - a.lastSeen);
}

export function functionalPercent(level) {
  return (level && typeof level.functional === 'number') ? level.functional : 50;
}

export function botStatusFor(level) {
  return (level && level.bot) ? level.bot : 'Standing by.';
}