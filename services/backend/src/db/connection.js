const { Pool } = require('pg');

// Connection is configured entirely through environment variables.
// In Kubernetes, these come from Secrets mounted as env vars.
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'myapp',
        user: process.env.DB_USER || 'myapp',
        password: process.env.DB_PASSWORD || 'myapp',
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

// Log pool errors (don't crash, just log — pool will retry)
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    console.log(`   Database time: ${result.rows[0].now}`);
  } finally {
    client.release();
  }
}

// Helper for running queries
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (duration > 1000) {
    console.warn(`⚠️  Slow query (${duration}ms): ${text.substring(0, 80)}`);
  }
  
  return result;
}

module.exports = { pool, testConnection, query };
