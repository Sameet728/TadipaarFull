const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const databaseUrl = (process.env.DATABASE_URL || '').trim();

if (databaseUrl) {
  console.log('[DB] DATABASE_URL loaded:', databaseUrl.slice(0, 20) + '...');
} else {
  console.warn('[DB] DATABASE_URL is not set. Using fallback DB config.');
}

let poolConfig;

if (databaseUrl) {
  poolConfig = {
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
  };
} else {
  const dbPassword = process.env.DB_PASSWORD;
  if (!dbPassword || !String(dbPassword).trim()) {
    throw new Error('DB_PASSWORD is required when DATABASE_URL is not set.');
  }

  poolConfig = {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'tadipaar',
    user:     process.env.DB_USER     || 'postgres',
    password: String(dbPassword).trim(),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(poolConfig);

pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    return;
  }
  release();
  console.log('PostgreSQL connected successfully');
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
