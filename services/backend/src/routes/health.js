const express = require('express');
const { pool } = require('../db/connection');

const router = express.Router();

// Liveness probe — is the process alive?
// K8s restarts the pod if this fails.
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness probe — can the pod serve traffic?
// K8s removes the pod from the Service endpoints if this fails.
// We check the database here because if DB is down, we can't serve requests.
router.get('/ready', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1');
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Readiness check failed:', err.message);
    res.status(503).json({
      status: 'not ready',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// Startup probe — has the app fully initialized?
// K8s won't send liveness/readiness probes until startup succeeds.
router.get('/startup', async (req, res) => {
  try {
    await pool.query('SELECT 1 FROM schema_migrations LIMIT 1');
    res.status(200).json({ status: 'started' });
  } catch (err) {
    res.status(503).json({ status: 'starting', error: err.message });
  }
});

module.exports = router;
