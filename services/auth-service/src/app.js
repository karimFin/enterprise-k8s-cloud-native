import cors from 'cors';
import crypto from 'crypto';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('combined'));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120,
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});

app.get('/startup', (req, res) => {
  res.json({ status: 'started' });
});

app.post('/auth/login', (req, res) => {
  const { email } = req.body || {};
  const token = crypto.randomUUID();
  res.json({ token, email: email || 'user@example.com' });
});

app.post('/auth/validate', (req, res) => {
  const { token } = req.body || {};
  res.json({ valid: Boolean(token) });
});

export default app;
