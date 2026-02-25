const crypto = require('crypto');

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'tasks';
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
const LLM_MODEL_FAST = process.env.LLM_MODEL_FAST || '';
const LLM_MODEL_ACCURATE = process.env.LLM_MODEL_ACCURATE || '';
const LLM_EMBED_MODEL = process.env.LLM_EMBED_MODEL || 'text-embedding-3-small';
const LLM_API_BASE = process.env.LLM_API_BASE || 'https://api.openai.com/v1';
const LLM_VECTOR_SIZE = parseInt(process.env.LLM_VECTOR_SIZE || '8', 10);
const LLM_ROUTING = (process.env.LLM_ROUTING || '').toLowerCase();
const LLM_ROUTING_MAX_CHARS = parseInt(process.env.LLM_ROUTING_MAX_CHARS || '200', 10);
const LLM_COST_INPUT_PER_1K = parseFloat(process.env.LLM_COST_INPUT_PER_1K || '0');
const LLM_COST_OUTPUT_PER_1K = parseFloat(process.env.LLM_COST_OUTPUT_PER_1K || '0');
const LLM_EMBED_COST_PER_1K = parseFloat(process.env.LLM_EMBED_COST_PER_1K || '0');
const LLM_API_KEY = process.env.LLM_API_KEY || '';

const metrics = {
  llmRequestsTotal: 0,
  llmRequestErrorsTotal: 0,
  llmDurationMsSum: 0,
  llmDurationMsCount: 0,
  llmTokensInTotal: 0,
  llmTokensOutTotal: 0,
  llmCostUsdTotal: 0,
  llmEmbedCostUsdTotal: 0,
  llmModelCounts: {},
};

function recordUsage({
  durationMs,
  tokensIn = 0,
  tokensOut = 0,
  error = false,
  model,
  costUsd = 0,
  embedCostUsd = 0,
}) {
  metrics.llmRequestsTotal += 1;
  metrics.llmDurationMsSum += durationMs;
  metrics.llmDurationMsCount += 1;
  metrics.llmTokensInTotal += tokensIn;
  metrics.llmTokensOutTotal += tokensOut;
  metrics.llmCostUsdTotal += costUsd;
  metrics.llmEmbedCostUsdTotal += embedCostUsd;
  if (error) metrics.llmRequestErrorsTotal += 1;
  if (model) {
    metrics.llmModelCounts[model] = (metrics.llmModelCounts[model] || 0) + 1;
  }
}

function getMetricsText() {
  return [
    `llm_requests_total ${metrics.llmRequestsTotal}`,
    `llm_request_errors_total ${metrics.llmRequestErrorsTotal}`,
    `llm_request_duration_ms_sum ${metrics.llmDurationMsSum}`,
    `llm_request_duration_ms_count ${metrics.llmDurationMsCount}`,
    `llm_tokens_in_total ${metrics.llmTokensInTotal}`,
    `llm_tokens_out_total ${metrics.llmTokensOutTotal}`,
    `llm_cost_usd_total ${metrics.llmCostUsdTotal.toFixed(6)}`,
    `llm_embed_cost_usd_total ${metrics.llmEmbedCostUsdTotal.toFixed(6)}`,
    '',
  ].join('\n');
}

function getUsageSnapshot() {
  const avgDurationMs =
    metrics.llmDurationMsCount > 0
      ? metrics.llmDurationMsSum / metrics.llmDurationMsCount
      : 0;
  return {
    requestsTotal: metrics.llmRequestsTotal,
    requestErrorsTotal: metrics.llmRequestErrorsTotal,
    avgDurationMs,
    tokensInTotal: metrics.llmTokensInTotal,
    tokensOutTotal: metrics.llmTokensOutTotal,
    costUsdTotal: Number(metrics.llmCostUsdTotal.toFixed(6)),
    embedCostUsdTotal: Number(metrics.llmEmbedCostUsdTotal.toFixed(6)),
    models: metrics.llmModelCounts,
    routing: {
      mode: LLM_ROUTING || 'off',
      fastModel: LLM_MODEL_FAST || null,
      accurateModel: LLM_MODEL_ACCURATE || null,
      thresholdChars: LLM_ROUTING_MAX_CHARS,
      defaultModel: LLM_MODEL,
    },
    pricing: {
      inputPer1k: LLM_COST_INPUT_PER_1K,
      outputPer1k: LLM_COST_OUTPUT_PER_1K,
      embedPer1k: LLM_EMBED_COST_PER_1K,
    },
  };
}

function mockEmbedding(text) {
  const hash = crypto.createHash('sha256').update(text).digest();
  const vector = [];
  for (let i = 0; i < LLM_VECTOR_SIZE; i += 1) {
    const byte = hash[i % hash.length];
    vector.push((byte / 255) * 2 - 1);
  }
  return vector;
}

function estimateTokens(text = '') {
  return Math.max(1, Math.ceil(text.length / 4));
}

function resolveModel(question) {
  if (LLM_ROUTING === 'length' && LLM_MODEL_FAST && LLM_MODEL_ACCURATE) {
    return question.length > LLM_ROUTING_MAX_CHARS ? LLM_MODEL_ACCURATE : LLM_MODEL_FAST;
  }
  return LLM_MODEL;
}

async function fetchJson(url, options = {}) {
  const { retry } = options;
  const fetchOptions = { ...options };
  delete fetchOptions.retry;

  const retries = retry?.retries ?? 0;
  const minDelayMs = retry?.minDelayMs ?? 200;
  const maxDelayMs = retry?.maxDelayMs ?? 1500;
  let attempt = 0;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  while (true) {
    const res = await fetch(url, fetchOptions);
    if (res.ok) {
      return res.json();
    }
    const body = await res.text();
    const error = new Error(`Request failed: ${res.status} ${res.statusText}`);
    error.status = res.status;
    error.body = body;

    if (attempt < retries && [429, 503, 504].includes(res.status)) {
      const delay = Math.min(maxDelayMs, minDelayMs * (2 ** attempt));
      attempt += 1;
      await sleep(delay);
      continue;
    }

    throw error;
  }
}

async function ensureCollection() {
  try {
    await fetchJson(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`);
    return;
  } catch (err) {
    if (err.status !== 404) throw err;
  }

  await fetchJson(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vectors: {
        size: LLM_VECTOR_SIZE,
        distance: 'Cosine',
      },
    }),
  });
}

async function embedText(text) {
  const start = Date.now();
  if (LLM_PROVIDER === 'openai') {
    if (!LLM_API_KEY) {
      throw new Error('LLM_API_KEY is missing');
    }
    const data = await fetchJson(`${LLM_API_BASE}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_EMBED_MODEL,
        input: text,
      }),
      retry: { retries: 2, minDelayMs: 300, maxDelayMs: 2000 },
    });
    const durationMs = Date.now() - start;
    const tokensIn = data.usage?.total_tokens || estimateTokens(text);
    const embedCostUsd = (tokensIn / 1000) * LLM_EMBED_COST_PER_1K;
    recordUsage({
      durationMs,
      tokensIn,
      tokensOut: 0,
      model: LLM_EMBED_MODEL,
      embedCostUsd,
    });
    return data.data[0].embedding;
  }
  const vector = mockEmbedding(text);
  const durationMs = Date.now() - start;
  recordUsage({
    durationMs,
    tokensIn: estimateTokens(text),
    tokensOut: 0,
    model: 'mock-embed',
  });
  return vector;
}

async function upsertPoints(points) {
  await ensureCollection();
  await fetchJson(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points?wait=true`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points }),
  });
}

async function searchPoints(vector, limit = 5) {
  await ensureCollection();
  const data = await fetchJson(
    `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector,
        limit,
        with_payload: true,
      }),
    }
  );
  return data.result || [];
}

async function askLLM(question, contextItems) {
  const context = contextItems
    .map((item, index) => {
      const payload = item.payload || {};
      return `${index + 1}. ${payload.title || 'Untitled'} - ${payload.description || ''}`.trim();
    })
    .join('\n');

  if (LLM_PROVIDER === 'openai') {
    if (!LLM_API_KEY) {
      throw new Error('LLM_API_KEY is missing');
    }
    const model = resolveModel(question);
    const start = Date.now();
    try {
      const data = await fetchJson(`${LLM_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LLM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant for a task management system.',
            },
            {
              role: 'user',
              content: `Question: ${question}\n\nContext:\n${context}`,
            },
          ],
          temperature: 0.2,
        }),
        retry: { retries: 2, minDelayMs: 500, maxDelayMs: 2500 },
      });
      const durationMs = Date.now() - start;
      const usage = data.usage || {};
      const tokensIn = usage.prompt_tokens || estimateTokens(`${question}\n${context}`);
      const tokensOut = usage.completion_tokens || estimateTokens(data.choices?.[0]?.message?.content || '');
      const costUsd =
        (tokensIn / 1000) * LLM_COST_INPUT_PER_1K +
        (tokensOut / 1000) * LLM_COST_OUTPUT_PER_1K;
      recordUsage({
        durationMs,
        tokensIn,
        tokensOut,
        model,
        costUsd,
      });
      return {
        answer: data.choices?.[0]?.message?.content || '',
        usage: {
          ...usage,
          model,
          cost_usd: Number(costUsd.toFixed(6)),
        },
      };
    } catch (err) {
      const durationMs = Date.now() - start;
      recordUsage({ durationMs, error: true, model });
      throw err;
    }
  }

  const start = Date.now();
  const answer = contextItems.length
    ? `Question: ${question}\nAnswer: Closest matching tasks: ${contextItems
        .map((item) => item.payload?.title)
        .filter(Boolean)
        .join(', ')}`
    : `Question: ${question}\nAnswer: No close matches found.`;
  const durationMs = Date.now() - start;
  const tokensIn = estimateTokens(question);
  const tokensOut = estimateTokens(answer);
  recordUsage({
    durationMs,
    tokensIn,
    tokensOut,
    model: 'mock-chat',
  });
  return {
    answer,
    usage: {
      prompt_tokens: tokensIn,
      completion_tokens: tokensOut,
      model: 'mock-chat',
      cost_usd: 0,
    },
  };
}

module.exports = {
  embedText,
  upsertPoints,
  searchPoints,
  askLLM,
  ensureCollection,
  getMetricsText,
  getUsageSnapshot,
};
