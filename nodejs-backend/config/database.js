const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || '3.7.1.231',
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'apppass',
  database: process.env.DB_NAME || 'cronberry_assets',
  port: Number(process.env.DB_PORT) || 5432,
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});


// Test database connection (non-fatal: server starts even if DB is down)
pool
  .connect()
  .then(client => {
    return client
      .query('SELECT 1')
      .then(() => {
        console.log('✓ PostgreSQL Database connected successfully');
        client.release();
      })
      .catch(err => {
        client.release();
        throw err;
      });
  })
  .catch(err => {
    console.error('✗ PostgreSQL connection error:', err.message);
    console.error('  Server will start but DB-dependent routes will fail until DB is reachable.');
    // Do NOT process.exit(1) - allows /health and /api to respond (avoids 502 from proxy)
  });

module.exports = pool;