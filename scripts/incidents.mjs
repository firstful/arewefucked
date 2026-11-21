// Incident ledger + Gen-Z-flavoured summaries from llm.ffilt.us.
// Runs only in the publisher; the static site just reads the resulting JSON.

const LLM_URL = process.env.LLM_URL || 'https://llm.ffilt.us/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'auto';
const LLM_TIMEOUT_MS = Math.max(1000, Number(process.env.LLM_TIMEOUT_MS || 30000));
const LLM_MAX_TOKENS = Math.max(500, Number(process.env.LLM_MAX_TOKENS || 8000));
const LLM_MAX_PER_RUN = Math.max(1, Number(process.env.LLM_MAX_PER_RUN || 20));
const LEDGER_LIMIT = Math.max(20, Number(process.env.INCIDENT_LEDGER_LIMIT || 200));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function incidentId(serviceId, incident) {
  const basis = [
    serviceId,
    String(incident?.title || '').trim().toLowerCase(),
    String(incident?.url || '').trim(),
  ].join('|');
  let hash = 0x811c9dc5;
  for (let i = 0; i < basis.length; i += 1) {
    hash ^= basis.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${serviceId}-${(hash >>> 0).toString(36)}`;
}

function cleanText(value) {
  return String(value || '')
    .replace(/```(?:json|text)?/gi, '')
    .replace(/^\s*["'“”]|["'“”]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260);
}

function summaryPrompt(batch) {
  const lines = batch.map((i) => `- id=${i.id} | service=${i.serviceName} | state=${i.state} | title=${i.title}`).join('\n');
  return [
    'You write copy for a blunt public status-page aggregator.',
    'For EACH incident below, write ONE short summary (1-2 sentences, under 30 words).',
    'Voice: light Gen Z attitude, dry and funny, like a tired sysadmin posting. No excessive slang, no emoji, no hashtags, no skibidi/rizz/gyatt nonsense.',
    'Do not invent facts or causality. Do not mention that you are an AI. Do not use markdown.',
    'Return ONLY a JSON array of objects: {"id":"the-id","text":"the summary"}. Include every id exactly once.',
    '',
    lines,
  ].join('\n');
}

async function requestSummaries(batch) {
  const response = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: 'You return strict JSON only. Keep summaries short, dry, and lightly Gen Z.' },
        { role: 'user', content: summaryPrompt(batch) },
      ],
      max_tokens: LLM_MAX_TOKENS,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM returned no content');
  const match = String(content).match(/\[[\s\S]*\]/);
  const parsed = JSON.parse(match ? match[0] : String(content));
  if (!Array.isArray(parsed)) throw new Error('LLM did not return a JSON array');
  const byId = new Map();
  for (const item of parsed) {
    if (item?.id && cleanText(item.text)) byId.set(String(item.id), cleanText(item.text));
  }
  return { byId, model: payload?.model || LLM_MODEL };
}

async function summarizeBatch(batch) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await requestSummaries(batch);
    } catch (error) {
      if (attempt === 2) return { byId: new Map(), model: null, error: String(error?.message || error) };
      await sleep(400 * attempt);
    }
  }
  return { byId: new Map(), model: null, error: 'unknown LLM error' };
}

export async function reconcileIncidents(services, previousIncidents = []) {
  const now = new Date().toISOString();
  const previous = new Map(
    (Array.isArray(previousIncidents) ? previousIncidents : [])
      .filter((i) => i?.id)
      .map((i) => [String(i.id), i]),
  );
  const seen = new Set();
  const active = [];

  for (const service of services) {
    for (const incident of service.status?.incidents || []) {
      const id = String(incident.id || incidentId(service.id, incident));
      if (!incident.title || seen.has(id)) continue;
      seen.add(id);
      const old = previous.get(id);
      const reappeared = Boolean(old?.resolvedAt);
      const record = {
        id,
        serviceId: service.id,
        serviceName: service.name,
        category: service.category,
        weight: service.weight,
        title: String(incident.title).slice(0, 200),
        url: incident.url || '',
        state: service.status.state,
        detectedAt: reappeared || !old ? now : old.detectedAt || now,
        firstSeenAt: old?.firstSeenAt || now,
        lastSeenAt: now,
        resolvedAt: null,
        summary: reappeared ? null : old?.summary || null,
        summaryModel: reappeared ? null : old?.summaryModel || null,
        summaryAt: reappeared ? null : old?.summaryAt || null,
        summaryError: reappeared ? null : old?.summaryError || null,
        summaryAttempts: reappeared ? 0 : old?.summaryAttempts || 0,
        summaryPending: reappeared || !old?.summary ? true : false,
      };
      active.push(record);
      previous.set(id, record);
    }
  }

  // Anything no longer in the feeds is considered resolved, but stays in the ledger.
  for (const [id, old] of previous) {
    if (!seen.has(id) && !old.resolvedAt) {
      previous.set(id, { ...old, resolvedAt: now, summaryPending: false });
    }
  }

  const pending = [...previous.values()]
    .filter((i) => i.summaryPending || (i.summaryError && !i.summary && (i.summaryAttempts || 0) < 2))
    .sort((a, b) => Date.parse(a.firstSeenAt) - Date.parse(b.firstSeenAt))
    .slice(0, LLM_MAX_PER_RUN);

  let generated = 0;
  if (pending.length) {
    const { byId, model, error } = await summarizeBatch(pending);
    for (const item of pending) {
      const text = byId.get(item.id);
      const current = previous.get(item.id);
      if (!current) continue;
      previous.set(item.id, text
        ? { ...current, summary: text, summaryModel: model, summaryAt: now, summaryError: null, summaryAttempts: 0, summaryPending: false }
        : {
            ...current,
            summaryError: error || 'summary unavailable',
            summaryAttempts: (current.summaryAttempts || 0) + 1,
            summaryPending: false,
          });
      generated += text ? 1 : 0;
    }
  }

  const incidents = [...previous.values()]
    .sort((a, b) => Date.parse(b.lastSeenAt || 0) - Date.parse(a.lastSeenAt || 0))
    .slice(0, LEDGER_LIMIT);

  if (pending.length) {
    console.log(`[susmeter] summarized ${generated}/${pending.length} new incidents via ${LLM_URL}`);
  }
  return incidents;
}
