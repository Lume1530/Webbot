console.log('Starting DB test...');
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000 // 5 seconds
});

pool.on('error', (err) => {
  console.error('Pool error:', err);
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message, err);
  } else {
    console.log('✅ Database connected successfully!', res.rows);
  }
  pool.end();
}); 