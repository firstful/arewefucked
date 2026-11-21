// One LLM-written phrase per publish, driven by the alert level and top incidents.

const LLM_URL = process.env.LLM_URL || 'https://llm.ffilt.us/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'auto';
const LLM_TIMEOUT_MS = Math.max(1000, Number(process.env.LLM_TIMEOUT_MS || 30000));
const LLM_MAX_TOKENS = Math.max(500, Number(process.env.HEADLINE_MAX_TOKENS || 2000));

const WEIGHT_SCORE = { S: 1, M: 2, L: 3, XL: 4, XXL: 5 };
const IMPACT = { ok: 0, maintenance: 0.5, sus: 1, cooked: 2, meltdown: 3, unknown: 0 };
const LEVELS = {
  5: { caption: 'NOMINAL', fallback: 'Nothing is on fire. For once.' },
  4: { caption: 'ELEVATED', fallback: 'Planned work or missing data. Nothing to panic about.' },
  3: { caption: 'DEGRADED', fallback: 'A few services are off. Keep an eye on it.' },
  2: { caption: 'CRITICAL', fallback: 'Yes, this is as bad as it looks.' },
  1: { caption: 'MELTDOWN', fallback: 'Several things are very, very not fine.' },
};

const clean = (value) => String(value || '')
  .replace(/```/g, '')
  .replace(/^\s*["'“”]|["'“”]\s*$/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 160);

export function scoreServices(services) {
  const score = services.reduce((sum, s) => sum + (IMPACT[s.status?.state] || 0) * (WEIGHT_SCORE[s.weight] || 2), 0);
  const major = services.some((s) => s.status?.state === 'meltdown' && ['XL', 'XXL'].includes(s.weight));
  const critical = services.some((s) => s.status?.state === 'cooked' && ['XL', 'XXL'].includes(s.weight));
  const n = score >= 40 || major ? 1 : score >= 12 || critical ? 2 : score >= 4 ? 3 : score > 0 ? 4 : 5;
  return { score, n, level: LEVELS[n] };
}

function topFive(services) {
  return services
    .filter((s) => s.status?.state && s.status.state !== 'ok')
    .map((s) => ({
      name: s.name,
      weight: s.weight,
      state: s.status.state,
      detail: s.status.detail || '',
      score: (IMPACT[s.status.state] || 0) * (WEIGHT_SCORE[s.weight] || 2) + (s.status.incidents?.length || 0) * 0.25,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function prompt(level, top) {
  const lines = top.length
    ? top.map((s) => `- ${s.name} (${s.weight}, ${s.state}): ${s.detail}`).join('\n')
    : '- No specific service is standing out.';
  return [
    'You write the headline for a blunt public status-page aggregator.',
    `Overall alert level: ${level.n} ${level.level.caption}. Default voice: "${level.level.fallback}"`,
    'Top affected or high-impact services right now:',
    lines,
    '',
    'Write ONE short headline phrase (3-10 words) in a light Gen Z mood. Dry and funny, like a tired sysadmin posting.',
    'No excessive slang, no emoji, no hashtags, no markdown, no explanation. Do not invent facts or causality.',
    'Return plain text only.',
  ].join('\n');
}

async function requestHeadline(level, top) {
  const response = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: 'You return one short plain-text phrase. No markdown.' },
        { role: 'user', content: prompt(level, top) },
      ],
      max_tokens: LLM_MAX_TOKENS,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
  const payload = await response.json();
  const text = clean(payload?.choices?.[0]?.message?.content);
  if (!text) throw new Error('LLM returned no headline');
  return { text, model: payload?.model || LLM_MODEL };
}

export async function generateHeadline(services) {
  const level = scoreServices(services);
  const top = topFive(services);
  const generatedAt = new Date().toISOString();
  try {
    const { text, model } = await requestHeadline(level, top);
    console.log(`[susmeter] headline via ${LLM_URL}: ${text}`);
    return {
      text,
      model,
      generatedAt,
      level: level.n,
      levelCaption: level.level.caption,
      topServices: top,
      source: 'llm',
    };
  } catch (error) {
    return {
      text: level.level.fallback,
      model: null,
      generatedAt,
      level: level.n,
      levelCaption: level.level.caption,
      topServices: top,
      source: 'default',
      error: String(error?.message || error),
    };
  }
}
