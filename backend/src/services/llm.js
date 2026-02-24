const crypto = require('crypto');

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'tasks';
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
const LLM_EMBED_MODEL = process.env.LLM_EMBED_MODEL || 'text-embedding-3-small';
const LLM_API_BASE = process.env.LLM_API_BASE || 'https://api.openai.com/v1';
const LLM_VECTOR_SIZE = parseInt(process.env.LLM_VECTOR_SIZE || '8', 10);
const LLM_API_KEY = process.env.LLM_API_KEY || '';

const metrics = {
  llmRequestsTotal: 0,
  llmRequestErrorsTotal: 0,
  llmDurationMsSum: 0,
  llmDurationMsCount: 0,
  llmTokensInTotal: 0,
  llmTokensOutTotal: 0,
};

function recordUsage({ durationMs, tokensIn = 0, tokensOut = 0, error = false }) {
  metrics.llmRequestsTotal += 1;
  metrics.llmDurationMsSum += durationMs;
  metrics.llmDurationMsCount += 1;
  metrics.llmTokensInTotal += tokensIn;
  metrics.llmTokensOutTotal += tokensOut;
  if (error) metrics.llmRequestErrorsTotal += 1;
}

function getMetricsText() {
  return [
    `llm_requests_total ${metrics.llmRequestsTotal}`,
    `llm_request_errors_total ${metrics.llmRequestErrorsTotal}`,
    `llm_request_duration_ms_sum ${metrics.llmDurationMsSum}`,
    `llm_request_duration_ms_count ${metrics.llmDurationMsCount}`,
    `llm_tokens_in_total ${metrics.llmTokensInTotal}`,
    `llm_tokens_out_total ${metrics.llmTokensOutTotal}`,
    '',
  ].join('\n');
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

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    const error = new Error(`Request failed: ${res.status} ${res.statusText}`);
    error.status = res.status;
    error.body = body;
    throw error;
  }
  return res.json();
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
    });
    return data.data[0].embedding;
  }
  return mockEmbedding(text);
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
    const start = Date.now();
    try {
      const data = await fetchJson(`${LLM_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LLM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: LLM_MODEL,
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
      });
      const durationMs = Date.now() - start;
      const usage = data.usage || {};
      recordUsage({
        durationMs,
        tokensIn: usage.prompt_tokens || 0,
        tokensOut: usage.completion_tokens || 0,
      });
      return {
        answer: data.choices?.[0]?.message?.content || '',
        usage,
      };
    } catch (err) {
      const durationMs = Date.now() - start;
      recordUsage({ durationMs, error: true });
      throw err;
    }
  }

  const start = Date.now();
  const answer = contextItems.length
    ? `প্রশ্ন: ${question}\nউত্তর: এই প্রশ্নের সাথে সবচেয়ে মিল থাকা টাস্কগুলো হলো: ${contextItems
        .map((item) => item.payload?.title)
        .filter(Boolean)
        .join(', ')}`
    : `প্রশ্ন: ${question}\nউত্তর: কোন মিল পাওয়া যায়নি।`;
  const durationMs = Date.now() - start;
  recordUsage({ durationMs, tokensIn: question.length, tokensOut: answer.length });
  return { answer, usage: { prompt_tokens: question.length, completion_tokens: answer.length } };
}

module.exports = {
  embedText,
  upsertPoints,
  searchPoints,
  askLLM,
  ensureCollection,
  getMetricsText,
};
