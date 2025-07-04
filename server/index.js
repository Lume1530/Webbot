const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Use your Supabase connection string here
const pool = new Pool({
  connectionString: 'postgresql://postgres:Cla$h123@db.oeagzcuecovjjcpmxolo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

// Save a new reel
app.post('/api/reels', async (req, res) => {
  const {
    userId, url, shortcode, username, views, likes, comments, thumbnail, isActive
  } = req.body;
  const now = new Date();
  const result = await pool.query(
    `INSERT INTO reels (userId, url, shortcode, username, views, likes, comments, thumbnail, submittedAt, lastUpdated, isActive)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [userId, url, shortcode, username, views, likes, comments, thumbnail, now, now, isActive]
  );
  res.json(result.rows[0]);
});

// Get all reels for a user
app.get('/api/reels/:userId', async (req, res) => {
  const result = await pool.query('SELECT * FROM reels WHERE userId = $1', [req.params.userId]);
  res.json(result.rows);
});

app.listen(4000, () => console.log('Server running on http://localhost:4000')); 