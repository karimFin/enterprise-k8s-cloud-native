const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const healthRoutes = require('./routes/health');
const taskRoutes = require('./routes/tasks');
const llmRoutes = require('./routes/llm');
const { getMetricsText } = require('./services/llm');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Security headers
app.use(helmet());

// CORS - configured via env var so each environment can set its own origin
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Request logging (skip health checks to reduce noise)
app.use(morgan('combined', {
  skip: (req) => req.path === '/health' || req.path === '/ready',
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

const apiAuthKey = process.env.API_AUTH_KEY || '';

const requireApiKey = (req, res, next) => {
  if (!apiAuthKey) {
    return next();
  }
  const headerKey = req.get('x-api-key');
  const authorization = req.get('authorization') || '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const providedKey = headerKey || bearer;
  if (!providedKey || providedKey !== apiAuthKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
};

const llmLimiter = rateLimit({
  windowMs: parseInt(process.env.LLM_RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.LLM_RATE_LIMIT_MAX || '30', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'LLM rate limit exceeded. Try again in a minute.' },
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health & readiness — used by Kubernetes probes
app.use('/', healthRoutes);

// Application routes
app.use('/api/tasks', taskRoutes);
app.use('/api/llm', requireApiKey, llmLimiter, llmRoutes);

app.get('/metrics', requireApiKey, (req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(getMetricsText());
});

// Root
app.get('/', (req, res) => {
  res.json({
    service: 'myapp-backend',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
