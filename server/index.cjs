require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const { createCanvas, registerFont } = require('canvas');
const nodemailer = require('nodemailer');
const { fetchInstagramStatsWithRapidAPI } = require('../src/utils/rapidapi');

const app = express();

// Configure CORS for your domain
app.use(cors({
  origin: [
    'http://localhost:5173', // Development
    'http://localhost:3000', // Alternative dev port
    'https://dlsgroup.org.in', // Your domain
    'http://dlsgroup.org.in', // HTTP fallback
    'https://www.dlsgroup.org.in', // WWW subdomain
    'http://www.dlsgroup.org.in' // WWW HTTP fallback
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Please check your Supabase connection string and credentials.');
  } else {
    console.log('✅ Database connected successfully!');
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Middleware to check if user is staff or admin
const requireStaff = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'staff') {
    return res.status(403).json({ error: 'Staff or admin access required' });
  }
  next();
};

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if username already exists
    const existingUsername = await pool.query(
      'SELECT * FROM public.users WHERE username = $1',
      [username]
    );

    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
    }

    // Check if email already exists
    const existingEmail = await pool.query(
      'SELECT * FROM public.users WHERE email = $1',
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists. Please use a different email address.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with is_approved = null (pending)
    const result = await pool.query(
      'INSERT INTO public.users (username, email, password_hash, role, is_approved) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, is_approved, created_at',
      [username, email, passwordHash, 'user', null]
    );

    // Notify all admins and staff about new user registration
    const staffAndAdmins = await pool.query('SELECT id FROM public.users WHERE role IN ($1, $2)', ['admin', 'staff']);
    for (const staff of staffAndAdmins.rows) {
      await pool.query(
        'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
        [staff.id, `New user registration: ${username} (${email}) is awaiting approval.`, 'user_registration']
      );
    }

    res.status(201).json({
      message: 'User registered successfully. Awaiting admin approval.',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if user is approved
    if (!user.is_approved) {
      return res.status(403).json({ error: 'Account pending approval' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create a welcome notification for staff users
    if (user.role === 'staff') {
      await pool.query(
        'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
        [user.id, `Welcome to the Staff Dashboard, ${user.username}! You can now manage user approvals, Instagram accounts, and content moderation.`, 'staff_welcome']
      );
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isApproved: user.is_approved
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add Instagram Account (requires authentication)
app.post('/api/accounts', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    // Check if account already exists for this user
    const existingAccount = await pool.query(
      'SELECT * FROM instagram_accounts WHERE user_id = $1 AND username = $2',
      [userId, username]
    );

    if (existingAccount.rows.length > 0) {
      return res.status(400).json({ error: 'You have already added this account' });
    }

    // Check if account already exists for any user
    const existingAccountAnyUser = await pool.query(
      'SELECT * FROM instagram_accounts WHERE username = $1',
      [username]
    );

    if (existingAccountAnyUser.rows.length > 0) {
      return res.status(400).json({ error: 'This Instagram account is already registered by another user' });
    }

    // Add account (pending approval, with submitted_at timestamp)
    const result = await pool.query(
      'INSERT INTO instagram_accounts (user_id, username, is_approved, submitted_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [userId, username, null]
    );
    const newAccount = result.rows[0];

    // Notify all admins and staff
    const staffAndAdmins = await pool.query('SELECT id FROM users WHERE role IN ($1, $2)', ['admin', 'staff']);
    for (const staff of staffAndAdmins.rows) {
      await pool.query(
        'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
        [staff.id, `A new Instagram account (@${username}) was submitted by user ID ${userId} and needs approval.`, 'account_approval']
      );
    }
    // Notify user
    await pool.query(
      'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
      [userId, `Your Instagram account @${username} was submitted for admin approval.`, 'account_submitted']
    );

    res.status(201).json({
      message: 'Account added successfully. Awaiting admin approval.',
      account: newAccount
    });
  } catch (error) {
    console.error('Add account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove Instagram Account
app.delete('/api/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const accountId = req.params.id;
    const userId = req.user.id;

    // Check if account belongs to user
    const result = await pool.query(
      'DELETE FROM instagram_accounts WHERE id = $1 AND user_id = $2 RETURNING *',
      [accountId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Notify user
    await pool.query(
      'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
      [userId, `Your Instagram account @${result.rows[0].username} was deleted.`, 'instagram_deleted']
    );

    res.json({ message: 'Account removed successfully' });
  } catch (error) {
    console.error('Remove account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's Instagram accounts
app.get('/api/accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let result;
    if (userRole === 'admin' || userRole === 'staff') {
      // Staff and admin see all accounts
      result = await pool.query('SELECT * FROM instagram_accounts ORDER BY submitted_at DESC');
    } else {
      // Regular users see only their own
      result = await pool.query('SELECT * FROM instagram_accounts WHERE user_id = $1 AND (is_approved = true OR is_approved IS NULL) ORDER BY submitted_at DESC', [userId]);
    }
    res.json(result.rows);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin/Staff: Get all pending accounts
app.get('/api/admin/accounts/pending', authenticateToken, requireStaff, async (req, res) => {
  try {
    console.log('Backend: Getting pending accounts for admin:', req.user.username);
    
    const result = await pool.query(`
      SELECT ia.*, u.username as user_username, u.email as user_email
      FROM instagram_accounts ia
      JOIN users u ON ia.user_id = u.id
      WHERE ia.is_approved IS NULL
      ORDER BY ia.submitted_at ASC
    `);

    console.log('Backend: Found pending accounts:', result.rows.length);
    console.log('Backend: Pending accounts data:', result.rows);

    res.json(result.rows);
  } catch (error) {
    console.error('Backend: Get pending accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin/Staff: Approve Instagram account
app.post('/api/admin/accounts/:id/approve', authenticateToken, requireStaff, async (req, res) => {
  try {
    const accountId = req.params.id;
    const approverId = req.user.id;
    const approverRole = req.user.role;
    const approverUsername = req.user.username;

    // Update account status
    const result = await pool.query(
      'UPDATE instagram_accounts SET is_approved = true, approved_at = NOW(), approved_by = $1 WHERE id = $2 RETURNING *',
      [approverId, accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = result.rows[0];

    // Notify user
    await pool.query(
      'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
      [account.user_id, `Your Instagram account @${account.username} has been approved by ${approverRole}!`, 'instagram_approved']
    );

    // Notify all admins and staff (except the approver)
    const staffAndAdmins = await pool.query('SELECT id FROM users WHERE role IN ($1, $2)', ['admin', 'staff']);
    for (const staff of staffAndAdmins.rows) {
      if (staff.id !== approverId) {
        await pool.query(
          'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
          [staff.id, `Instagram account @${account.username} has been approved by ${approverRole} ${approverUsername}.`, 'instagram_approved']
        );
      }
    }

    res.json({ message: 'Account approved successfully', account: account });
  } catch (error) {
    console.error('Approve account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin/Staff: Reject Instagram account
app.post('/api/admin/accounts/:id/reject', authenticateToken, requireStaff, async (req, res) => {
  try {
    const accountId = req.params.id;
    const { rejectionReason } = req.body;
    const rejectorId = req.user.id;
    const rejectorRole = req.user.role;
    const rejectorUsername = req.user.username;

    // Update account status - set to false to mark as rejected
    const result = await pool.query(
      'UPDATE instagram_accounts SET is_approved = false, approved_at = NOW(), approved_by = $1, rejection_reason = $2 WHERE id = $3 RETURNING *',
      [rejectorId, rejectionReason, accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = result.rows[0];

    // Notify user
    const message = rejectionReason 
      ? `Your Instagram account @${account.username} was rejected by ${rejectorRole}. Reason: ${rejectionReason}`
      : `Your Instagram account @${account.username} was rejected by ${rejectorRole}.`;
    await pool.query(
      'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
      [account.user_id, message, 'instagram_rejected']
    );

    // Notify all admins and staff (except the rejector)
    const staffAndAdmins = await pool.query('SELECT id FROM users WHERE role IN ($1, $2)', ['admin', 'staff']);
    for (const staff of staffAndAdmins.rows) {
      if (staff.id !== rejectorId) {
        await pool.query(
          'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
          [staff.id, `Instagram account @${account.username} was rejected by ${rejectorRole} ${rejectorUsername}.`, 'instagram_rejected']
        );
      }
    }

    res.json({ message: 'Account rejected successfully', account: account });
  } catch (error) {
    console.error('Reject account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Getting notifications for user:', userId, 'role:', req.user.role);
    
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND (is_read = false OR is_read IS NULL) ORDER BY created_at DESC',
      [userId]
    );
    
    console.log('Found notifications:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread notification count
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Getting unread count for user:', userId, 'role:', req.user.role);
    
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND (is_read = false OR is_read IS NULL)',
      [userId]
    );
    
    const count = parseInt(result.rows[0].count, 10);
    console.log('Unread count:', count);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin/Staff: Get all users
app.get('/api/admin/users', authenticateToken, requireStaff, async (req, res) => {
  try {
    console.log('Backend: Getting all users for admin:', req.user.username);
    
    const result = await pool.query(
      'SELECT id, username, email, role, is_approved, created_at FROM users WHERE (is_approved = true OR is_approved IS NULL) ORDER BY created_at DESC'
    );

    console.log('Backend: Found users:', result.rows.length);
    console.log('Backend: Users data:', result.rows.map(u => ({ id: u.id, username: u.username, is_approved: u.is_approved })));

    res.json(result.rows);
  } catch (error) {
    console.error('Backend: Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin/Staff: Approve user
app.post('/api/admin/users/:id/approve', authenticateToken, requireStaff, async (req, res) => {
  try {
    const userId = req.params.id;
    const approverRole = req.user.role;
    const approverId = req.user.id;
    
    console.log('Backend: Approving user:', userId, 'by', approverRole, ':', req.user.username);
    const result = await pool.query(
      'UPDATE users SET is_approved = true WHERE id = $1 RETURNING *',
      [userId]
    );
    console.log('Backend: Approve result:', result.rows.length > 0 ? 'Success' : 'User not found');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create notification for user
    await pool.query(
      'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
      [userId, 'Your account has been approved! You can now log in.', 'user_approved']
    );
    
    // Notify all admins and staff
    const staffAndAdmins = await pool.query('SELECT id FROM users WHERE role IN ($1, $2)', ['admin', 'staff']);
    for (const staff of staffAndAdmins.rows) {
      if (staff.id !== approverId) { // Don't notify the person who did the action
        await pool.query(
          'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
          [staff.id, `User ID ${userId} has been approved by ${approverRole} ${req.user.username}.`, 'user_approved']
        );
      }
    }
    
    console.log('Backend: User approved successfully');
    res.json({ message: 'User approved successfully' });
  } catch (error) {
    console.error('Backend: Approve user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Edit user views (add/remove views using dummy reel)
app.post('/api/admin/users/:id/views', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { action, amount } = req.body;
    const adminId = req.user.id;
    const adminUsername = req.user.username;
    
    console.log('Views endpoint called with:', { userId, action, amount, adminUsername });
    
    if (!action || !amount || (action !== 'add' && action !== 'remove') || amount <= 0) {
      return res.status(400).json({ error: 'Invalid action or amount' });
    }
    
    // Get user info
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Check if user already has a dummy reel for admin view adjustments
    const dummyReelResult = await pool.query(
      'SELECT id, views FROM reels WHERE userid = $1 AND is_dummy = true AND shortcode = $2',
      [userId, 'DUMMY-ADMIN-VIEWS']
    );
    
    let dummyReelId;
    let currentDummyViews = 0;
    
    if (dummyReelResult.rows.length > 0) {
      // Update existing dummy reel
      dummyReelId = dummyReelResult.rows[0].id;
      currentDummyViews = dummyReelResult.rows[0].views || 0;
      
      let newViews = currentDummyViews;
      if (action === 'add') {
        newViews += amount;
      } else {
        newViews -= amount; // allow negative values
      }
      
      await pool.query('UPDATE reels SET views = $1 WHERE id = $2', [newViews, dummyReelId]);
      
    } else {
      // Create new dummy reel
      const viewsToAdd = action === 'add' ? amount : 0; // If removing and no dummy reel exists, start at 0
      
      const createResult = await pool.query(`
        INSERT INTO reels (userid, url, shortcode, username, views, likes, comments, thumbnail, submitted_at, lastUpdated, isActive, is_dummy)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), false, true)
        RETURNING id
      `, [
        userId,
        'https://dummy-url-for-admin-views.com',
        'DUMMY-ADMIN-VIEWS',
        user.username,
        viewsToAdd,
        0,
        0,
        'https://dummy-thumbnail.com'
      ]);
      
      dummyReelId = createResult.rows[0].id;
    }
    
    // Log the action for admin reference
    console.log(`Admin ${adminUsername} ${action}ed ${amount} views to user ${user.username} (ID: ${userId}) via dummy reel`);
    
    res.json({ 
      message: `Successfully ${action}ed ${amount} views to user ${user.username}`,
      action,
      amount,
      dummyReelId
    });
  } catch (error) {
    console.error('Edit user views error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Admin/Staff: Reject user (add this endpoint if not present)
app.post('/api/admin/users/:id/reject', authenticateToken, requireStaff, async (req, res) => {
  try {
    const userId = req.params.id;
    const { rejectionReason } = req.body;
    const rejectorId = req.user.id;
    const rejectorRole = req.user.role;
    const rejectorUsername = req.user.username;
    
    // Get user info before rejecting
    const userResult = await pool.query('SELECT username, email FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    
    // Optionally, set is_approved to false or delete user, depending on your logic
    await pool.query('UPDATE users SET is_approved = false WHERE id = $1', [userId]);
    
    // Notify user
    await pool.query(
      'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
      [userId, rejectionReason ? `Your account was rejected by ${rejectorRole}. Reason: ${rejectionReason}` : `Your account was rejected by ${rejectorRole}.`, 'user_rejected']
    );
    
    // Notify all admins and staff (except the rejector)
    const staffAndAdmins = await pool.query('SELECT id FROM users WHERE role IN ($1, $2)', ['admin', 'staff']);
    for (const staff of staffAndAdmins.rows) {
      if (staff.id !== rejectorId) {
        await pool.query(
          'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
          [staff.id, `User ${user?.username || userId} (${user?.email || ''}) was rejected by ${rejectorRole} ${rejectorUsername}.`, 'user_rejected']
        );
      }
    }
    
    res.json({ message: 'User rejected successfully' });
  } catch (error) {
    console.error('Backend: Reject user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Updated reel submission with account verification
app.post('/api/reels', authenticateToken, async (req, res) => {
  try {
    const {
      url, shortcode, username, thumbnail, isActive, campaign_id
    } = req.body;
    const userId = req.user.id;

    // Check if the Instagram account belongs to the user and is approved
    const accountResult = await pool.query(
      'SELECT * FROM instagram_accounts WHERE user_id = $1 AND username = $2 AND is_approved = true AND is_active = true',
      [userId, username]
    );

    if (accountResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Account does not belong to you or is not approved. Please add and get approval for this Instagram account first.' 
      });
    }

    // If campaign_id is provided, verify campaign is active
    if (campaign_id) {
      const campaignResult = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaign_id]);
      if (campaignResult.rows.length === 0 || campaignResult.rows[0].status !== 'active') {
        return res.status(403).json({ error: 'This campaign is not active.' });
      }
    }

    // Check for duplicate reel (by URL or shortcode, case-insensitive)
    const duplicateCheck = await pool.query(
      'SELECT * FROM reels WHERE LOWER(url) = LOWER($1) OR LOWER(shortcode) = LOWER($2)',
      [url, shortcode]
    );

    if (duplicateCheck.rows.length > 0) {
      // Consistent error message for frontend
      return res.status(400).json({ 
        error: 'No duplicate links allowed.' 
      });
    }

    // Fetch stats from RapidAPI
    let stats;
    try {
      stats = await fetchInstagramStatsWithRapidAPI({ url, userId });
    } catch (err) {
      console.error('Failed to fetch stats from RapidAPI:', err);
      return res.status(500).json({ error: 'Failed to fetch Instagram stats.' });
    }

    const now = new Date();
    const result = await pool.query(
      `INSERT INTO reels (userId, url, shortcode, username, views, likes, comments, thumbnail, submitted_at, lastUpdated, isActive, campaign_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [userId, url, shortcode, username, stats.views, stats.likes, stats.comments, stats.thumbnail, now, now, isActive, campaign_id]
    );
    
    // Notify all admins and staff about new reel submission
    const staffAndAdmins = await pool.query('SELECT id FROM users WHERE role IN ($1, $2)', ['admin', 'staff']);
    for (const staff of staffAndAdmins.rows) {
      await pool.query(
        'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
        [staff.id, `New reel submitted: @${username} submitted "${shortcode}" for review.`, 'reel_submitted']
      );
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Submit reel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all reels for a user (updated to use authentication)
app.get('/api/reels', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT r.*, c.name as campaign_name, c.pay_rate as campaign_pay_rate, c.description as campaign_description, c.status as campaign_status
      FROM reels r
      LEFT JOIN campaigns c ON r.campaign_id = c.id
      WHERE r.userId = $1 AND (r.is_dummy = false OR r.is_dummy IS NULL)
      ORDER BY r.submitted_at DESC
    `, [userId]);
    
    // Transform the data to match the expected format
    const reels = result.rows.map(row => ({
      ...row,
      campaign: row.campaign_id ? {
        id: row.campaign_id,
        name: row.campaign_name,
        pay_rate: row.campaign_pay_rate,
        description: row.campaign_description,
        status: row.campaign_status
      } : null
    }));
    
    res.json(reels);
  } catch (error) {
    console.error('Get reels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create admin user (for testing - remove in production)
app.post('/api/create-admin', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if admin already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, is_approved) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, is_approved, created_at',
      [username, email, passwordHash, 'admin', true]
    );

    res.status(201).json({
      message: 'Admin user created successfully.',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create staff user (for testing - remove in production)
app.post('/api/create-staff', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if staff already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create staff user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, is_approved) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, is_approved, created_at',
      [username, email, passwordHash, 'staff', true]
    );

    res.status(201).json({
      message: 'Staff user created successfully.',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin/Staff: Delete user and all related data
app.delete('/api/admin/users/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    const userId = req.params.id;
    // Get user info before deleting for notification
    const userResult = await pool.query('SELECT username, email FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    // Delete notifications
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    // Delete instagram accounts
    await pool.query('DELETE FROM instagram_accounts WHERE user_id = $1', [userId]);
    // Delete reels
    await pool.query('DELETE FROM reels WHERE userid = $1', [userId]);
    // Delete campaign assignments
    await pool.query('DELETE FROM campaign_assignments WHERE user_id = $1', [userId]);
    // Delete user
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Notify all admins
    const admins = await pool.query('SELECT id FROM users WHERE role = $1', ['admin']);
    for (const admin of admins.rows) {
      await pool.query(
        'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
        [admin.id, `User ${user?.username || userId} (${user?.email || ''}) was deleted by admin.`, 'user_deleted']
      );
    }
    // Optionally, notify the user (if you want to keep a record for deleted users, you may need a separate table)
    // Skipping user notification since their account is deleted
    // Log the deletion for admin reference
    if (user) {
      console.log(`User ${user.username} (${user.email}) account has been deleted by admin`);
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User: Delete their own reel
app.delete('/api/reels/:id', authenticateToken, async (req, res) => {
  try {
    const reelId = req.params.id;
    const userId = req.user.id;
    const result = await pool.query('DELETE FROM reels WHERE id = $1 AND userid = $2 RETURNING *', [reelId, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reel not found' });
    }
    res.json({ message: 'Reel deleted successfully' });
  } catch (error) {
    console.error('Delete reel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get total views for the current user
app.get('/api/reels/total-views', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT COALESCE(SUM(views), 0) AS total_views FROM reels WHERE userid = $1',
      [userId]
    );
    res.json({ totalViews: parseInt(result.rows[0].total_views, 10) });
  } catch (error) {
    console.error('Get total views error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- CAMPAIGNS TABLE MIGRATION (run this SQL in your DB) ---
// CREATE TABLE campaigns (
//   id SERIAL PRIMARY KEY,
//   name VARCHAR(255) NOT NULL,
//   pay_rate NUMERIC NOT NULL, -- $ per 1M views
//   total_budget NUMERIC NOT NULL, -- $
//   description TEXT,
//   requirements TEXT,
//   platform VARCHAR(32) NOT NULL, -- 'instagram', 'tiktok', 'youtube', 'twitter'
//   created_at TIMESTAMP DEFAULT NOW()
// );

// --- CAMPAIGN ASSIGNMENTS TABLE MIGRATION (run this SQL in your DB) ---
// CREATE TABLE campaign_assignments (
//   id SERIAL PRIMARY KEY,
//   user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//   campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
//   assigned_at TIMESTAMP DEFAULT NOW(),
//   status VARCHAR(32) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
//   UNIQUE(user_id, campaign_id)
// );

// --- ADD CAMPAIGN_ID TO REELS TABLE (run this SQL in your DB) ---
// ALTER TABLE reels ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL;

// --- CAMPAIGNS API ---
// Create a campaign (admin only)
app.post('/api/campaigns', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, pay_rate, total_budget, description, requirements, platform, status } = req.body;
    const result = await pool.query(
      'INSERT INTO campaigns (name, pay_rate, total_budget, description, requirements, platform, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, pay_rate, total_budget, description, requirements, platform, status || 'active']
    );
    res.status(201).json({ campaign: result.rows[0] });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all campaigns (public)
app.get('/api/campaigns', async (req, res) => {
  try {
    // First check if campaign_assignments table exists
    const assignmentsTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'campaign_assignments'
      );
    `);
    
    let query;
    if (assignmentsTableExists.rows[0].exists) {
      query = `
        SELECT 
          c.*,
          COALESCE(COUNT(DISTINCT CASE WHEN ca.status = 'active' THEN ca.user_id END), 0) as active_users,
          COALESCE(SUM(r.views), 0) as total_views,
          (COALESCE(SUM(r.views), 0) / 1000000.0 * c.pay_rate) as estimated_payout
        FROM campaigns c
        LEFT JOIN campaign_assignments ca ON c.id = ca.campaign_id
        LEFT JOIN reels r ON c.id = r.campaign_id
        GROUP BY c.id, c.name, c.pay_rate, c.total_budget, c.description, c.requirements, c.platform, c.created_at, c.status
        ORDER BY c.created_at DESC
      `;
    } else {
      // If campaign_assignments table doesn't exist, just get basic campaign data
      query = `
        SELECT 
          c.*,
          0 as active_users,
          COALESCE(SUM(r.views), 0) as total_views,
          (COALESCE(SUM(r.views), 0) / 1000000.0 * c.pay_rate) as estimated_payout
        FROM campaigns c
        LEFT JOIN reels r ON c.id = r.campaign_id
        GROUP BY c.id, c.name, c.pay_rate, c.total_budget, c.description, c.requirements, c.platform, c.created_at, c.status
        ORDER BY c.created_at DESC
      `;
    }
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('List campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a campaign (admin only)
app.delete('/api/campaigns/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const result = await pool.query('DELETE FROM campaigns WHERE id = $1 RETURNING *', [campaignId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a campaign (admin only)
app.put('/api/campaigns/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const { name, pay_rate, total_budget, description, requirements, platform, status } = req.body;
    
    const result = await pool.query(
      'UPDATE campaigns SET name = $1, pay_rate = $2, total_budget = $3, description = $4, requirements = $5, platform = $6, status = $7 WHERE id = $8 RETURNING *',
      [name, pay_rate, total_budget, description, requirements, platform, status, campaignId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json({ campaign: result.rows[0] });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- USER PAYMENT METHODS ---
// Add these columns to your users table:
// ALTER TABLE users ADD COLUMN usdt VARCHAR(128);
// ALTER TABLE users ADD COLUMN upi VARCHAR(128);
// ALTER TABLE users ADD COLUMN paypal VARCHAR(128);

// Get user payment methods
app.get('/api/user/payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('SELECT usdt, upi, paypal, telegram FROM users WHERE id = $1', [userId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user payment methods
app.put('/api/user/payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { usdt, upi, paypal, telegram } = req.body;
    console.log('Updating payment methods for user:', userId, { usdt, upi, paypal, telegram }); // Debug log
    await pool.query('UPDATE users SET usdt = $1, upi = $2, paypal = $3, telegram = $4 WHERE id = $5', [usdt, upi, paypal, telegram, userId]);
    res.json({ message: 'Payment methods updated' });
  } catch (error) {
    console.error('Update payment methods error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user total payout
app.get('/api/user/payout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const PAYOUT_PER_MILLION = 25; // $25 per 1M views
    
    // Get total views for the user
    const result = await pool.query(
      'SELECT COALESCE(SUM(views), 0) AS total_views FROM reels WHERE userid = $1 AND (is_dummy = false OR is_dummy IS NULL)',
      [userId]
    );
    
    const totalViews = parseInt(result.rows[0].total_views, 10);
    const totalPayout = (totalViews / 1_000_000) * PAYOUT_PER_MILLION;
    
    res.json({ totalPayout: totalPayout.toFixed(2) });
  } catch (error) {
    console.error('Get total payout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all reels for admin/staff
app.get('/api/admin/reels', authenticateToken, requireStaff, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        u.username,
        c.name as campaign_name,
        c.id as campaign_id,
        TO_CHAR(r.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as submitted_at_formatted
      FROM reels r
      LEFT JOIN users u ON r.userid = u.id
      LEFT JOIN campaigns c ON r.campaign_id = c.id
      WHERE (r.is_dummy = false OR r.is_dummy IS NULL)
      ORDER BY c.name NULLS LAST, r.submitted_at DESC
    `);
    
    // Transform the data to match frontend expectations
    const transformedReels = result.rows.map(reel => {
      const baseReel = {
        ...reel,
        submitted_at: reel.submitted_at_formatted,
        campaign: reel.campaign_name ? {
          id: reel.campaign_id,
          name: reel.campaign_name
        } : null
      };
      
      // Hide confidential data from staff users
      if (req.user.role === 'staff') {
        return {
          ...baseReel,
          views: null, // Hide view count from staff
          likes: null, // Hide like count from staff
          comments: null // Hide comment count from staff
        };
      }
      
      return baseReel;
    });
    
    res.json(transformedReels);
  } catch (error) {
    console.error('Get admin reels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a reel
app.delete('/api/admin/reels/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const deleterId = req.user.id;
    const deleterRole = req.user.role;
    const deleterUsername = req.user.username;
    
    // Get reel info before deleting for notification
    const reelResult = await pool.query(`
      SELECT r.*, u.username, u.email, c.name as campaign_name
      FROM reels r
      LEFT JOIN users u ON r.userid = u.id
      LEFT JOIN campaigns c ON r.campaign_id = c.id
      WHERE r.id = $1
    `, [id]);
    
    const reel = reelResult.rows[0];
    
    // Delete the reel
    await pool.query('DELETE FROM reels WHERE id = $1', [id]);
    
    // Send notification to user if reel was found
    if (reel && reel.userid) {
      await pool.query(`
        INSERT INTO notifications (user_id, message, type, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [
        reel.userid,
        `Your reel "${reel.shortcode}" from campaign "${reel.campaign_name || 'General'}" has been deleted by ${deleterRole} ${deleterUsername}.`,
        'reel_deleted'
      ]);
    }
    
    // Notify all admins and staff (except the deleter)
    const staffAndAdmins = await pool.query('SELECT id FROM users WHERE role IN ($1, $2)', ['admin', 'staff']);
    for (const staff of staffAndAdmins.rows) {
      if (staff.id !== deleterId) {
        await pool.query(`
          INSERT INTO notifications (user_id, message, type, created_at)
          VALUES ($1, $2, $3, NOW())
        `, [
          staff.id,
          `Reel "${reel?.shortcode || id}" has been deleted by ${deleterRole} ${deleterUsername}.`,
          'reel_deleted'
        ]);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete reel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk delete reels
app.post('/api/admin/reels/bulk-delete', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { reelIds } = req.body;
    
    // Get reel info before deleting for notifications
    const reelsResult = await pool.query(`
      SELECT r.*, u.username, u.email, c.name as campaign_name
      FROM reels r
      LEFT JOIN users u ON r.userid = u.id
      LEFT JOIN campaigns c ON r.campaign_id = c.id
      WHERE r.id = ANY($1)
    `, [reelIds]);
    
    // Delete the reels
    await pool.query('DELETE FROM reels WHERE id = ANY($1)', [reelIds]);
    
    // Send notifications to users
    for (const reel of reelsResult.rows) {
      if (reel.userid) {
        await pool.query(`
          INSERT INTO notifications (user_id, message, type, created_at)
          VALUES ($1, $2, $3, NOW())
        `, [
          reel.userid,
          `Your reel "${reel.shortcode}" from campaign "${reel.campaign_name || 'General'}" has been deleted by an administrator.`,
          'reel_deleted'
        ]);
      }
    }
    
    res.json({ success: true, deletedCount: reelIds.length });
  } catch (error) {
    console.error('Bulk delete reels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get global stats
// NOTE: This includes all reels, including dummy reels, in the total views calculation.
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) AS total_reels,
        COALESCE(SUM(views), 0) AS total_views,
        SUM(CASE WHEN isactive = true THEN 1 ELSE 0 END) AS active_reels,
        (COALESCE(SUM(views), 0) / 1000000.0 * 25) AS total_payout
      FROM reels
    `);
    const stats = statsResult.rows[0];
    res.json({
      totalReels: parseInt(stats.total_reels, 10),
      totalViews: parseInt(stats.total_views, 10),
      activeReels: parseInt(stats.active_reels, 10),
      totalPayout: parseFloat(stats.total_payout).toFixed(2)
    });
  } catch (error) {
    console.error('Admin: Get global stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- CAMPAIGN ASSIGNMENTS API ---
// Join a campaign
app.post('/api/campaigns/:id/join', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const userId = req.user.id;
    
    // Check if campaign exists and is active
    const campaignResult = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    if (campaignResult.rows[0].status !== 'active') {
      return res.status(403).json({ error: 'Campaign is not active' });
    }
    // Check if user is already assigned to this campaign
    const existingAssignment = await pool.query(
      'SELECT * FROM campaign_assignments WHERE user_id = $1 AND campaign_id = $2',
      [userId, campaignId]
    );
    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({ error: 'You are already assigned to this campaign' });
    }
    // Assign user to campaign
    const result = await pool.query(
      'INSERT INTO campaign_assignments (user_id, campaign_id) VALUES ($1, $2) RETURNING *',
      [userId, campaignId]
    );
    res.status(201).json({ 
      message: 'Successfully joined campaign!',
      assignment: result.rows[0],
      campaign: campaignResult.rows[0]
    });
  } catch (error) {
    console.error('Join campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's assigned campaigns
app.get('/api/user/campaigns', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT 
        ca.id as assignment_id,
        ca.user_id,
        ca.campaign_id,
        ca.assigned_at,
        ca.status as assignment_status,
        c.id as campaign_id,
        c.name as campaign_name,
        c.pay_rate as campaign_pay_rate,
        c.total_budget as campaign_total_budget,
        c.description as campaign_description,
        c.requirements as campaign_requirements,
        c.platform as campaign_platform,
        c.created_at as campaign_created_at,
        c.status as campaign_status
      FROM campaign_assignments ca
      INNER JOIN campaigns c ON ca.campaign_id = c.id
      WHERE ca.user_id = $1 AND ca.status = 'active'
      ORDER BY ca.assigned_at DESC
    `, [userId]);
    
    // Transform the data to match the expected format
    const assignments = result.rows.map(row => ({
      id: row.assignment_id,
      user_id: row.user_id,
      campaign_id: row.campaign_id,
      assigned_at: row.assigned_at,
      status: row.assignment_status,
      campaign: {
        id: row.campaign_id,
        name: row.campaign_name,
        pay_rate: row.campaign_pay_rate,
        total_budget: row.campaign_total_budget,
        description: row.campaign_description,
        requirements: row.campaign_requirements,
        platform: row.campaign_platform,
        created_at: row.campaign_created_at,
        status: row.campaign_status
      }
    }));
    
    res.json(assignments);
  } catch (error) {
    console.error('Get user campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available campaigns (not yet joined by user)
app.get('/api/campaigns/available', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT c.id, c.name, c.pay_rate, c.total_budget, c.description, c.requirements, c.platform, c.status, c.created_at
      FROM campaigns c
      WHERE c.id NOT IN (
        SELECT campaign_id 
        FROM campaign_assignments 
        WHERE user_id = $1
      )
      ORDER BY c.created_at DESC
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get available campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export campaign reels data
app.get('/api/admin/campaigns/:id/export', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        r.shortcode,
        r.url,
        u.username,
        r.views,
        r.likes,
        r.comments,
        r.caption,
        TO_CHAR(r.submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted_date,
        c.name as campaign_name,
        c.pay_rate,
        (r.views / 1000000.0 * c.pay_rate) as estimated_earnings
      FROM reels r
      LEFT JOIN users u ON r.userid = u.id
      LEFT JOIN campaigns c ON r.campaign_id = c.id
      WHERE r.campaign_id = $1 AND (r.is_dummy = false OR r.is_dummy IS NULL)
      ORDER BY r.submitted_at DESC
    `, [id]);
    
    // Get campaign info
    const campaignResult = await pool.query('SELECT name FROM campaigns WHERE id = $1', [id]);
    const campaignName = campaignResult.rows[0]?.name || 'Unknown Campaign';
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${campaignName}_reels_export.csv"`);
    
    // Create CSV content
    const csvHeaders = [
      'Shortcode',
      'URL',
      'Username',
      'Views',
      'Likes', 
      'Comments',
      'Caption',
      'Submitted Date',
      'Campaign Name',
      'Pay Rate ($/1M views)',
      'Estimated Earnings ($)'
    ].join(',');
    
    const csvRows = result.rows.map(reel => [
      reel.shortcode || '',
      reel.url || '',
      reel.username || '',
      reel.views || 0,
      reel.likes || 0,
      reel.comments || 0,
      `"${(reel.caption || '').replace(/"/g, '""')}"`, // Escape quotes in caption
      reel.submitted_date || '',
      reel.campaign_name || '',
      reel.pay_rate || 0,
      (reel.estimated_earnings ? Number(reel.estimated_earnings) : 0).toFixed(2)
    ].join(','));
    
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    res.send(csvContent);
    
  } catch (error) {
    console.error('Export campaign reels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export all reels data
app.get('/api/admin/reels/export', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.shortcode,
        r.url,
        u.username,
        r.views,
        r.likes,
        r.comments,
        r.caption,
        TO_CHAR(r.submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted_date,
        c.name as campaign_name,
        c.pay_rate,
        (r.views / 1000000.0 * c.pay_rate) as estimated_earnings
      FROM reels r
      LEFT JOIN users u ON r.userid = u.id
      LEFT JOIN campaigns c ON r.campaign_id = c.id
      WHERE r.is_dummy = false OR r.is_dummy IS NULL
      ORDER BY c.name NULLS LAST, r.submitted_at DESC
    `);
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="all_reels_export.csv"');
    // Create CSV content
    const csvHeaders = [
      'Shortcode',
      'URL',
      'Username',
      'Views',
      'Likes', 
      'Comments',
      'Caption',
      'Submitted Date',
      'Campaign Name',
      'Pay Rate ($/1M views)',
      'Estimated Earnings ($)'
    ].join(',');
    const csvRows = result.rows.map(reel => [
      reel.shortcode || '',
      reel.url || '',
      reel.username || '',
      reel.views || 0,
      reel.likes || 0,
      reel.comments || 0,
      `"${(reel.caption || '').replace(/"/g, '""')}"`, // Escape quotes in caption
      reel.submitted_date || '',
      reel.campaign_name || 'General',
      reel.pay_rate || 0,
      (reel.estimated_earnings ? Number(reel.estimated_earnings) : 0).toFixed(2)
    ].join(','));
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    res.send(csvContent);
  } catch (error) {
    console.error('Export all reels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get all Instagram accounts
app.get('/api/admin/instagram-accounts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ia.*, u.username as user_username, u.email as user_email
      FROM instagram_accounts ia
      JOIN users u ON ia.user_id = u.id
      ORDER BY ia.submitted_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all Instagram accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export campaign user summary (Excel)
app.get('/api/admin/campaigns/:id/export-summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Get campaign info
    const campaignResult = await pool.query('SELECT name, pay_rate FROM campaigns WHERE id = $1', [id]);
    const campaign = campaignResult.rows[0];
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    // Get all users in this campaign
    const usersResult = await pool.query(`
      SELECT u.id, u.username, u.usdt, u.upi, u.paypal
      FROM users u
      JOIN campaign_assignments ca ON ca.user_id = u.id
      WHERE ca.campaign_id = $1 AND ca.status = 'active'
    `, [id]);
    // Get all reels for this campaign
    const reelsResult = await pool.query(`
      SELECT userid, views
      FROM reels
      WHERE campaign_id = $1 AND (is_dummy = false OR is_dummy IS NULL)
    `, [id]);
    // Aggregate stats per user
    const userStats = {};
    for (const user of usersResult.rows) {
      userStats[user.id] = {
        username: user.username,
        usdt: user.usdt,
        upi: user.upi,
        paypal: user.paypal,
        totalViews: 0,
        totalVids: 0,
        payout: 0
      };
    }
    for (const reel of reelsResult.rows) {
      if (userStats[reel.userid]) {
        userStats[reel.userid].totalViews += Number(reel.views) || 0;
        userStats[reel.userid].totalVids += 1;
      }
    }
    for (const uid in userStats) {
      userStats[uid].payout = (userStats[uid].totalViews / 1000000) * Number(campaign.pay_rate);
    }
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Campaign Summary');
    sheet.columns = [
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Total Views', key: 'totalViews', width: 15 },
      { header: 'Total Vids', key: 'totalVids', width: 12 },
      { header: 'Payment Method', key: 'payment', width: 30 },
      { header: 'Estimated Payout', key: 'payout', width: 18 }
    ];
    for (const stat of Object.values(userStats)) {
      let payment = stat.usdt ? `USDT: ${stat.usdt}` : stat.upi ? `UPI: ${stat.upi}` : stat.paypal ? `PayPal: ${stat.paypal}` : '';
      sheet.addRow({
        username: stat.username,
        totalViews: stat.totalViews,
        totalVids: stat.totalVids,
        payment,
        payout: stat.payout.toFixed(2)
      });
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${campaign.name}_summary.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export campaign summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export campaign leaderboard image
app.get('/api/admin/campaigns/:id/leaderboard-image', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Get campaign info
    const campaignResult = await pool.query('SELECT name FROM campaigns WHERE id = $1', [id]);
    const campaign = campaignResult.rows[0];
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    // Get all reels for this campaign
    const reelsResult = await pool.query(`
      SELECT userid, u.username, SUM(r.views) as total_views
      FROM reels r
      JOIN users u ON r.userid = u.id
      WHERE r.campaign_id = $1 AND (r.is_dummy = false OR r.is_dummy IS NULL)
      GROUP BY userid, u.username
      ORDER BY total_views DESC
    `, [id]);
    let leaderboard = reelsResult.rows;
    // Limit to top 100
    if (leaderboard.length > 100) leaderboard = leaderboard.slice(0, 100);
    // Two columns layout
    const width = 900;
    const colWidth = width / 2;
    const rowHeight = 48;
    const headerHeight = 80;
    const numRows = Math.ceil(leaderboard.length / 2);
    const height = headerHeight + numRows * rowHeight + 40;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    // Campaign name
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#22223b';
    ctx.textAlign = 'center';
    ctx.fillText(campaign.name, width / 2, 48);
    // Leaderboard header
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#4f46e5';
    ctx.textAlign = 'left';
    ctx.fillText('Rank', 40, headerHeight);
    ctx.fillText('Username', 120, headerHeight);
    ctx.fillText('Total Views', 340, headerHeight);
    ctx.fillText('Rank', 40 + colWidth, headerHeight);
    ctx.fillText('Username', 120 + colWidth, headerHeight);
    ctx.fillText('Total Views', 340 + colWidth, headerHeight);
    // Rankings in two columns
    ctx.font = '18px Arial';
    ctx.fillStyle = '#22223b';
    for (let i = 0; i < leaderboard.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const y = headerHeight + (row + 1) * rowHeight;
      const xOffset = col * colWidth;
      ctx.fillText(`${i + 1}.`, 40 + xOffset, y);
      ctx.fillText(leaderboard[i].username, 120 + xOffset, y);
      ctx.fillText(Number(leaderboard[i].total_views).toLocaleString(), 340 + xOffset, y);
    }
    // Border
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);
    // Output PNG
    res.setHeader('Content-Type', 'image/png');
    canvas.pngStream().pipe(res);
  } catch (error) {
    console.error('Export leaderboard image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Delete any Instagram account by ID
app.delete('/api/admin/accounts/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    const accountId = req.params.id;
    const result = await pool.query('DELETE FROM instagram_accounts WHERE id = $1 RETURNING *', [accountId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Admin: Failed to delete Instagram account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ensure the server starts
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🌐 Domain: dlsgroup.org.in`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

app.post('/api/send-support-mail', async (req, res) => {
  try {
    const { name, email, contact, message } = req.body;
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Change if using another provider
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.SUPPORT_EMAIL,
      subject: 'New Partner With Us Submission',
      text: `Name: ${name}\nEmail: ${email}\nContact: ${contact}\nMessage: ${message}`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Support mail sent successfully.' });
  } catch (error) {
    console.error('Support mail error:', error);
    res.status(500).json({ error: 'Failed to send support mail.' });
  }
});