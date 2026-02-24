const express = require('express');
const { query } = require('../db/connection');
const {
  embedText,
  upsertPoints,
  searchPoints,
  askLLM,
  ensureCollection,
  getUsageSnapshot,
} = require('../services/llm');

const router = express.Router();
const rateLimitResponse = { error: 'LLM rate limit exceeded. Try again in a minute.' };

router.get('/health', async (req, res, next) => {
  try {
    await ensureCollection();
    res.json({ status: 'ok' });
  } catch (err) {
    err.statusCode = 503;
    next(err);
  }
});

router.post('/reindex', async (req, res, next) => {
  try {
    const limit = parseInt(req.body?.limit || '0', 10);
    const result = await query(
      `SELECT id, title, description, status, priority, assigned_to
       FROM tasks
       ORDER BY created_at DESC
       ${limit > 0 ? `LIMIT ${limit}` : ''}`
    );

    const points = [];
    for (const task of result.rows) {
      const content = `${task.title}\n${task.description || ''}`.trim();
      const vector = await embedText(content);
      points.push({
        id: task.id,
        vector,
        payload: {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assigned_to: task.assigned_to,
        },
      });
    }

    if (points.length > 0) {
      await upsertPoints(points);
    }

    res.json({ indexed: points.length });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json(rateLimitResponse);
    }
    next(err);
  }
});

router.post('/search', async (req, res, next) => {
  try {
    const { query: queryText, limit = 5 } = req.body || {};
    if (!queryText || typeof queryText !== 'string') {
      return res.status(400).json({ error: 'query is required' });
    }
    const vector = await embedText(queryText);
    const matches = await searchPoints(vector, parseInt(limit, 10));
    res.json({
      matches: matches.map((match) => ({
        id: match.id,
        score: match.score,
        payload: match.payload,
      })),
    });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json(rateLimitResponse);
    }
    next(err);
  }
});

router.post('/ask', async (req, res, next) => {
  try {
    const { question, limit = 5 } = req.body || {};
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'question is required' });
    }
    const vector = await embedText(question);
    const matches = await searchPoints(vector, parseInt(limit, 10));
    const response = await askLLM(question, matches);
    res.json({
      answer: response.answer,
      usage: response.usage,
      sources: matches.map((match) => ({
        id: match.id,
        score: match.score,
        payload: match.payload,
      })),
    });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json(rateLimitResponse);
    }
    next(err);
  }
});

router.get('/usage', (req, res) => {
  res.json(getUsageSnapshot());
});

router.post('/eval', async (req, res, next) => {
  try {
    const { cases, limit = 5 } = req.body || {};
    let evalCases = Array.isArray(cases) ? cases : [];

    if (evalCases.length === 0) {
      const result = await query(
        `SELECT title
         FROM tasks
         ORDER BY created_at DESC
         LIMIT 5`
      );
      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'No tasks available for eval' });
      }
      evalCases = result.rows.map((row) => ({
        question: `Find task: ${row.title}`,
        expectedTitles: [row.title],
        limit,
      }));
    }

    const invalidCase = evalCases.find(
      (item) => !item || typeof item.question !== 'string' || item.question.trim().length === 0
    );
    if (invalidCase) {
      return res.status(400).json({ error: 'Each eval case requires a question string' });
    }

    const results = [];
    let passed = 0;

    for (const evalCase of evalCases) {
      const caseLimit = parseInt(evalCase.limit || limit, 10);
      const vector = await embedText(evalCase.question.trim());
      const matches = await searchPoints(vector, caseLimit);
      const topTitles = matches.map((match) => match.payload?.title).filter(Boolean);
      const expectedTitles = Array.isArray(evalCase.expectedTitles)
        ? evalCase.expectedTitles
        : [];
      const hit = expectedTitles.length
        ? expectedTitles.some((title) => topTitles.includes(title))
        : topTitles.length > 0;
      if (hit) passed += 1;
      results.push({
        question: evalCase.question,
        expectedTitles,
        topTitles,
        hit,
      });
    }

    const total = results.length;
    res.json({
      total,
      passed,
      passRate: total ? Number((passed / total).toFixed(3)) : 0,
      results,
    });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json(rateLimitResponse);
    }
    next(err);
  }
});

module.exports = router;
