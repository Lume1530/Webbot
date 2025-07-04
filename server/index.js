const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const saltRounds = 10;

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

// --- USER MANAGEMENT ---

// Get all users
app.get('/api/admin/users', async (req, res) => {
  const result = await pool.query('SELECT * FROM users');
  console.log('All users from DB:', result.rows);
  const users = result.rows.map(u => ({
    ...u,
    isApproved: u.is_approved,
    createdAt: u.created_at,
  }));
  res.json(users);
});

// Approve a user
app.post('/api/admin/users/:id/approve', async (req, res) => {
  const userId = req.params.id;
  await pool.query('UPDATE users SET is_approved = true WHERE id = $1', [userId]);
  res.json({ success: true });
});

// Update a user
app.put('/api/admin/users/:id', async (req, res) => {
  const userId = req.params.id;
  const updates = req.body;
  // Example: update username and email
  await pool.query('UPDATE users SET username = $1, email = $2 WHERE id = $3', [updates.username, updates.email, userId]);
  res.json({ success: true });
});

// Delete a user
app.delete('/api/admin/users/:id', async (req, res) => {
  const userId = req.params.id;
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  res.json({ success: true });
});

// --- REELS MANAGEMENT ---

// Get all reels (admin)
app.get('/api/admin/reels', async (req, res) => {
  const result = await pool.query('SELECT * FROM reels');
  res.json(result.rows);
});

// Delete a reel
app.delete('/api/admin/reels/:reelId', async (req, res) => {
  const reelId = req.params.reelId;
  await pool.query('DELETE FROM reels WHERE id = $1', [reelId]);
  res.json({ success: true });
});

// Bulk delete reels
app.post('/api/admin/reels/bulk-delete', async (req, res) => {
  const { reelIds } = req.body;
  await pool.query('DELETE FROM reels WHERE id = ANY($1)', [reelIds]);
  res.json({ success: true });
});

// --- CAMPAIGNS ---

// Get all campaigns
app.get('/api/campaigns', async (req, res) => {
  const result = await pool.query('SELECT * FROM campaigns');
  res.json(result.rows);
});

// Create a campaign
app.post('/api/campaigns', async (req, res) => {
  const { name, pay_rate, total_budget, description, requirements, platform, status } = req.body;
  await pool.query(
    'INSERT INTO campaigns (name, pay_rate, total_budget, description, requirements, platform, status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [name, pay_rate, total_budget, description, requirements, platform, status]
  );
  res.json({ success: true });
});

// Update a campaign
app.put('/api/campaigns/:id', async (req, res) => {
  const id = req.params.id;
  const { name, pay_rate, total_budget, description, requirements, platform, status } = req.body;
  await pool.query(
    'UPDATE campaigns SET name=$1, pay_rate=$2, total_budget=$3, description=$4, requirements=$5, platform=$6, status=$7 WHERE id=$8',
    [name, pay_rate, total_budget, description, requirements, platform, status, id]
  );
  res.json({ success: true });
});

// Delete a campaign
app.delete('/api/campaigns/:id', async (req, res) => {
  const id = req.params.id;
  await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
  res.json({ success: true });
});

// --- STATS (Dummy Example) ---

app.get('/api/admin/stats', async (req, res) => {
  // Replace with real stats logic
  res.json({ totalReels: 0, totalViews: 0, totalPayout: '0.00', activeReels: 0 });
});

// --- INSTAGRAM ACCOUNTS (Dummy Example) ---

app.get('/api/admin/instagram-accounts', async (req, res) => {
  // Replace with real logic
  res.json([]);
});

// --- USER PAYMENT (Dummy Example) ---

app.get('/api/user/payment', async (req, res) => {
  // Replace with real logic
  res.json({ usdt: '', upi: '', paypal: '', telegram: '' });
});

app.put('/api/user/payment', async (req, res) => {
  // Replace with real logic
  res.json({ success: true });
});

// --- SUPPORT MAIL (Dummy Example) ---

app.post('/api/send-support-mail', async (req, res) => {
  // Replace with real logic to send mail
  res.json({ success: true });
});

// --- EXPORT/LEADERBOARD/ETC (Dummy Endpoints) ---

app.get('/api/admin/campaigns/:campaignId/export', (req, res) => res.json({ success: true }));
app.get('/api/admin/reels/export', (req, res) => res.json({ success: true }));
app.post('/api/admin/users/:id/views', (req, res) => res.json({ success: true }));
app.get('/api/admin/campaigns/:campaignId/export-summary', (req, res) => res.json({ success: true }));
app.get('/api/admin/campaigns/:campaignId/leaderboard-image', (req, res) => res.json({ success: true }));

// --- USER PAYOUT (Dummy Example) ---

app.post('/api/user/payout', (req, res) => res.json({ success: true }));

// --- USER REGISTRATION (EXAMPLE) ---
// Register a new user (pending approval by default)
app.post('/api/register', async (req, res) => {
  const { username, email, password, password_hash, role } = req.body;
  let finalPasswordHash = password_hash;
  if (!finalPasswordHash && password) {
    finalPasswordHash = await bcrypt.hash(password, saltRounds);
  }
  if (!finalPasswordHash) {
    return res.status(400).json({ error: 'Password or password_hash required' });
  }
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  // Debug log for is_approved value
  console.log('Registering user with is_approved:', null);
  const result = await pool.query(
    'INSERT INTO users (username, email, password_hash, role, is_approved, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
    [username, email, finalPasswordHash, role || 'user', null]
  );
  res.json(result.rows[0]);
});

app.listen(4000, () => console.log('Server running on http://localhost:4000')); 