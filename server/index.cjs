require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const { createCanvas, registerFont } = require('canvas');
const nodemailer = require('nodemailer');
const { html } = require('framer-motion/client');
// RapidAPI configuration
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// Validate RapidAPI key is present
if (!RAPIDAPI_KEY) {
  console.error('❌ RAPIDAPI_KEY environment variable is required');
  console.error('Please add RAPIDAPI_KEY to your .env file');
  process.exit(1);
}

// Helper function to format dates consistently
const formatDateForDisplay = (date) => {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// Function to fetch Instagram stats using the new RapidAPI
const fetchInstagramStatsWithRapidAPI = async ({ url, userId }) => {
  try {
    const encodedUrl = encodeURIComponent(url);
    const apiUrl = `https://instagram-scraper-stable-api.p.rapidapi.com/get_media_data.php?reel_post_code_or_url=${encodedUrl}&type=reel`;
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com'
      }
    };
    const response = await fetch(apiUrl, options);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
      }
      throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check for API error responses
    if (data.error || data.message) {
      throw new Error(`API returned error: ${data.error || data.message}`);
    }
    
    // Parse the response for views, likes, comments
    const views = data.video_play_count || 0;
    const likes = data.edge_media_preview_like?.count || 0;
    const comments = data.edge_media_preview_comment?.count || 0;
    const username = data.owner?.username || 'unknown';
    const shortcode = data.shortcode || '';
    const thumbnail = data.display_url || data.thumbnail || '';
    
    // Extract post date from Instagram data
    let postDate = null;
    if (data.taken_at_timestamp) {
      // Instagram provides timestamp in seconds since epoch
      postDate = new Date(data.taken_at_timestamp * 1000);
    } else if (data.edge_media_to_caption?.edges?.[0]?.node?.created_at) {
      // Alternative field for post date
      postDate = new Date(data.edge_media_to_caption.edges[0].node.created_at);
    }
    
    return {
      views,
      likes,
      comments,
      username,
      shortcode,
      thumbnail,
      postDate
    };
  } catch (error) {
    console.error('Error fetching Instagram stats with RapidAPI:', error.message);
    
    // If it's a rate limit error, re-throw it so the caller can handle it
    if (error.message.includes('Rate limit exceeded')) {
      throw error;
    }
    
    // For other errors, return fallback data
    return {
      views: Math.floor(Math.random() * 10000) + 1000,
      likes: Math.floor(Math.random() * 500) + 50,
      comments: Math.floor(Math.random() * 100) + 10,
      username: 'instagram_user',
      shortcode: '',
      thumbnail: '',
      postDate: new Date() // Use current date as fallback
    };
  }
};

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
function generateSixDigitOTP() {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}
// --- End of generateSixDigitOTP definition ---

// A utility function to update OTP in the database
async function updateOtpInDb(userId, otp, expiryMinutes = 5) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    await pool.query(
        'UPDATE public.users SET otp = $1, otp_expires_at = $2 WHERE id = $3',
        [otp, expiresAt, userId]
    );
    return expiresAt;
}

// --- REGISTER API ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, referralCode } = req.body;

        // Validate username is not empty
        // if (!username || username.trim() === '') {
        //     return res.status(400).json({ error: 'Username is required' });
        // }

        // 2. Check if email already exists
        const existingEmail = await pool.query(
            'SELECT * FROM public.users WHERE email = $1',
            [email]
        );
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists. Please use a different email address.' });
        }

        // 3. Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 4. Create user with is_approved = null (pending)
        // Note: OTP fields will be null initially, populated after successful user creation
        const result = await pool.query(
            'INSERT INTO public.users (username, email, password_hash, role, is_approved) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, is_approved, created_at',
            [username, email, passwordHash, 'user', null]
        );
        const newUserId = result.rows[0].id;

        // 5. Generate and update unique referral code
        const generatedReferralCode = 'user_' + newUserId;
        await pool.query('UPDATE users SET referral_code = $1 WHERE id = $2', [generatedReferralCode, newUserId]);

        // 6. Handle referral if provided
        let referrerInfo = null;
        if (referralCode) {
            const referrer = await pool.query('SELECT id, username, email FROM users WHERE referral_code = $1', [referralCode]);
            if (referrer.rows.length > 0) {
                // Prevent self-referral
                if (referrer.rows[0].id !== newUserId) {
                    await pool.query('UPDATE users SET referred_by = $1 WHERE id = $2', [referrer.rows[0].id, newUserId]);
                }
            }
        }

        // 7. Generate OTP and store it with expiry
        const otp = generateSixDigitOTP();
        await updateOtpInDb(newUserId,otp);

        // 8. Send OTP email to the newly registered user
        await sendEmail(email,
             'DLS Group OTP Verification',
            '',
            `<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>DLS Group OTP Verification</title> <style> @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap'); body { font-family: 'Poppins', sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; color: #333333; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; } .email-container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e0e0e0; } .header { background: linear-gradient(to right, #3b82f6, #06b6d4); padding: 25px; text-align: center; color: #ffffff; border-bottom: 1px solid #0056b3; } .header h2 { margin: 0; font-size: 28px; font-weight: 600; } .content { padding: 30px 40px; text-align: left; line-height: 1.6; } .otp-box { text-align: center; margin: 25px 0; background-color: #eaf6ff; border-radius: 8px; padding: 15px 25px; display: inline-block; width: fit-content; margin-left: auto; margin-right: auto; } .otp-box p { font-size: 36px; font-weight: bold; color: #007bff; margin: 0; letter-spacing: 4px; } .action-button { display: inline-block; background: linear-gradient(to right, #3b82f6, #06b6d4); color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; margin: 20px 0; box-shadow: 0 4px 10px rgba(0, 123, 255, 0.3); transition: background-color 0.3s ease, transform 0.2s ease; } .action-button:hover { background-color: #0056b3; transform: translateY(-2px); } .footer { background-color: #f0f0f0; padding: 25px 40px; text-align: center; font-size: 14px; color: #777777; border-top: 1px solid #e0e0e0; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; } .footer a { color: #007bff; text-decoration: none; font-weight: 500; } @media(max-width: 600px) { .email-container { margin: 20px 15px; border-radius: 8px; } .header { padding: 20px; } .header h2 { font-size: 24px; } .content { padding: 20px 25px; } .otp-box p { font-size: 30px; } .action-button { padding: 12px 24px; font-size: 16px; } .footer { padding: 20px; } } </style> </head> <body> <div class="email-container"> <div class="header"> <h2>DLS Group</h2> </div> <div class="content"> <p>Dear Creator,</p> <p>To verify your account, please use the One-Time Password(OTP) provided below. For your security, <strong>do not share this OTP with anyone.</strong></p> <div style="text-align: center;"> <div class="otp-box"> <p>${otp}</p> </div> </div> <p>This OTP is valid for 5 minutes. Please use it promptly to complete your registration.</p>  </div> <div class="footer"> <p>Best regards,<br>The DLS Group Team</p> <p style="margin-top: 15px;">&copy; 2025 DLS Group. All rights reserved.</p> </div> </div> </body> </html>`
        );

        // 9. Notify admins and staff about new user registration
        const staffAndAdmins = await pool.query('SELECT id FROM public.users WHERE role IN ($1, $2)', ['admin', 'staff']);
        for (const staff of staffAndAdmins.rows) {
            await pool.query(
                'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
                [staff.id, `New user registration: ${username} (${email}) is awaiting approval and OTP verification.`, 'user_registration']
            );
        }

        res.status(201).json({
            message: 'User registered successfully. An OTP has been sent to your email for verification. Awaiting admin approval after verification.',
            user: {
                id: result.rows[0].id,
                username: result.rows[0].username,
                email: result.rows[0].email,
                role: result.rows[0].role,
                is_approved: result.rows[0].is_approved
            },
            referrerInfo
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    try {
        const { email, otp,password } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required.' });
        }

        const userResult = await pool.query(
            'SELECT id, otp, username,email,password_hash,role,otp_expires_at, is_approved FROM public.users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const user = userResult.rows[0];

         const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

        // Check if OTP is correct
        if (user.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP.' });
        }

        // Check if OTP has expired
        const currentTime = new Date();
        if (user.otp_expires_at && currentTime > new Date(user.otp_expires_at)) {
            // Clear expired OTP from DB for security
            await pool.query(
                'UPDATE public.users SET otp = NULL, otp_expires_at = NULL WHERE id = $1',
                [user.id]
            );
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        // If OTP is valid and not expired, clear it and mark user as verified (or ready for admin approval)
        // Here, we'll mark is_approved to true and keep is_approved as null for admin approval workflow
        await pool.query(
            'UPDATE public.users SET otp = NULL, otp_expires_at = NULL, is_approved = TRUE WHERE id = $1 RETURNING is_approved',
            [user.id]
        );

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


    res.json({
      message: 'OTP verified successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isApproved:true
      }
    });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email, otp,password } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required.' });
        }

        const userResult = await pool.query(
            'SELECT id, otp, username,email,password_hash,role,otp_expires_at, is_approved FROM public.users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const user = userResult.rows[0];

        
        // Check if OTP is correct
        if (user.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP.' });
        }

        // Check if OTP has expired
        const currentTime = new Date();
        if (user.otp_expires_at && currentTime > new Date(user.otp_expires_at)) {
            // Clear expired OTP from DB for security
            await pool.query(
                'UPDATE public.users SET otp = NULL, otp_expires_at = NULL WHERE id = $1',
                [user.id]
            );
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }
 const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        // If OTP is valid and not expired, clear it and mark user as verified (or ready for admin approval)
        // Here, we'll mark is_approved to true and keep is_approved as null for admin approval workflow
        await pool.query(
            'UPDATE public.users SET otp = NULL, otp_expires_at = NULL, is_approved = TRUE, password_hash = $2 WHERE id = $1 RETURNING is_approved',
            [user.id,passwordHash]
        );

      

    res.json({
      message: 'Password updated successful',
      
    });

    } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- RESEND OTP API ---
app.post('/api/resend-otp', async (req, res) => {
    try {
        const { email,password } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        const userResult = await pool.query(
            'SELECT id, email, is_approved,password_hash FROM public.users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }


        const user = userResult.rows[0];

    //     const validPassword = await bcrypt.compare(password, user.password_hash);
    // if (!validPassword) {
    //   return res.status(401).json({ error: 'Invalid credentials' });
    // }

    //     // Prevent resending OTP if email is already verified
    //     if (user.is_approved) {
    //         return res.status(400).json({ message: 'Email is already verified.' });
    //     }

        // Generate new OTP and store it with expiry
        const otp = generateSixDigitOTP();
        const otpExpiresAt = await updateOtpInDb(user.id, otp);

        // Send new OTP email
        await sendEmail(user.email,
            'DLS Group OTP Verification (Resend)',
           '',
            `<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>DLS Group OTP Verification</title> <style> @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap'); body { font-family: 'Poppins', sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; color: #333333; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; } .email-container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e0e0e0; } .header { background: linear-gradient(to right, #3b82f6, #06b6d4); padding: 25px; text-align: center; color: #ffffff; border-bottom: 1px solid #0056b3; } .header h2 { margin: 0; font-size: 28px; font-weight: 600; } .content { padding: 30px 40px; text-align: left; line-height: 1.6; } .otp-box { text-align: center; margin: 25px 0; background-color: #eaf6ff; border-radius: 8px; padding: 15px 25px; display: inline-block; width: fit-content; margin-left: auto; margin-right: auto; } .otp-box p { font-size: 36px; font-weight: bold; color: #007bff; margin: 0; letter-spacing: 4px; } .action-button { display: inline-block; background: linear-gradient(to right, #3b82f6, #06b6d4); color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; margin: 20px 0; box-shadow: 0 4px 10px rgba(0, 123, 255, 0.3); transition: background-color 0.3s ease, transform 0.2s ease; } .action-button:hover { background-color: #0056b3; transform: translateY(-2px); } .footer { background-color: #f0f0f0; padding: 25px 40px; text-align: center; font-size: 14px; color: #777777; border-top: 1px solid #e0e0e0; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; } .footer a { color: #007bff; text-decoration: none; font-weight: 500; } @media(max-width: 600px) { .email-container { margin: 20px 15px; border-radius: 8px; } .header { padding: 20px; } .header h2 { font-size: 24px; } .content { padding: 20px 25px; } .otp-box p { font-size: 30px; } .action-button { padding: 12px 24px; font-size: 16px; } .footer { padding: 20px; } } </style> </head> <body> <div class="email-container"> <div class="header"> <h2>DLS Group</h2> </div> <div class="content"> <p>Dear Creator,</p> <p>You have requested a new One-Time Password(OTP) for your DLS Group account. Please use the OTP provided below to verify your account. For your security, <strong>do not share this OTP with anyone.</strong></p> <div style="text-align: center;"> <div class="otp-box"> <p>${otp}</p> </div> </div> <p>This OTP is valid for 5 minutes. Please use it promptly to complete your verification.</p>  </div> <div class="footer"> <p>Best regards,<br>The DLS Group Team</p> <p style="margin-top: 15px;">&copy; 2025 DLS Group. All rights reserved.</p> </div> </div> </body> </html>`
        );

        res.status(200).json({ message: 'New OTP sent to your email.' });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// User Login
app.get('/api/check-email', async (req, res) => {
  try {
    const { email } = req.query;

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    res.json({
      message: 'Check Email Exist',
      user: {
        user_exist: result.rows.length > 0,
        isApproved: result.rows.length > 0 ? result.rows[0].is_approved : null,
      },
    });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({ error: 'Failed to get email details' });
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
    // Always store and compare lowercase
    const username = req.body.username.toLowerCase();
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
      [account.user_id, `YOur page has successfully been linked to DLS Creator Dashboard.`, 'instagram_approved']
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
    
    // Only allow integer values (positive, zero, or negative)
    if (amount === undefined || isNaN(amount) || !Number.isInteger(Number(amount))) {
      return res.status(400).json({ error: 'Amount must be an integer' });
    }
    
    // Get user info
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Check if user already has a dummy reel for admin view adjustments
    const dummyReelResult = await pool.query(
      'SELECT id FROM reels WHERE userid = $1 AND is_dummy = true AND shortcode = $2',
      [userId, 'DUMMY-ADMIN-VIEWS']
    );
    
    let dummyReelId;
    if (dummyReelResult.rows.length > 0) {
      // Update existing dummy reel: set views to the provided amount
      dummyReelId = dummyReelResult.rows[0].id;
      await pool.query('UPDATE reels SET views = $1 WHERE id = $2', [amount, dummyReelId]);
    } else {
      // Create new dummy reel with the provided amount
      const createResult = await pool.query(`
        INSERT INTO reels (userid, url, shortcode, username, views, likes, comments, thumbnail, submitted_at, lastUpdated, isActive, is_dummy)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), false, true)
        RETURNING id
      `, [
        userId,
        'https://dummy-url-for-admin-views.com',
        'DUMMY-ADMIN-VIEWS',
        user.username,
        amount,
        0,
        0,
        'https://dummy-thumbnail.com'
      ]);
      dummyReelId = createResult.rows[0].id;
    }
    
    // Log the action for admin reference
    console.log(`Admin ${adminUsername} set dummy reel views to ${amount} for user ${user.username} (ID: ${userId})`);
    
    res.json({ 
      message: `Successfully set dummy reel views to ${amount} for user ${user.username}`,
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
      url, shortcode, username: rawUsername, thumbnail, isActive, campaign_id
    } = req.body;
    const username = rawUsername.toLowerCase();
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
    let campaign = null;
    if (campaign_id) {
      const campaignResult = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaign_id]);
      if (campaignResult.rows.length === 0 || campaignResult.rows[0].status !== 'active') {
        return res.status(403).json({ error: 'This campaign is not active.' });
      }
      campaign = campaignResult.rows[0];
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

    // Check post date restriction if campaign has min_post_date set
    if (campaign && campaign.min_post_date) {
      if (!stats.postDate) {
        return res.status(400).json({ 
          error: 'Unable to determine the post date of this reel. Please try again or contact support if the issue persists.' 
        });
      }
      
      const minPostDate = new Date(campaign.min_post_date);
      const postDate = new Date(stats.postDate);
      
      if (postDate < minPostDate) {
        const formattedMinDate = formatDateForDisplay(minPostDate);
        const formattedPostDate = formatDateForDisplay(postDate);
        return res.status(400).json({ 
          error: `This reel was posted on ${formattedPostDate}. Only reels posted on or after ${formattedMinDate} are allowed. Please submit a newer reel.` 
        });
      }
    }

    const now = new Date();
    const result = await pool.query(
      `INSERT INTO reels (userId, url, shortcode, username, views, likes, comments, thumbnail, submitted_at, lastUpdated, isActive, campaign_id, post_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [userId, url, shortcode, username, stats.views, stats.likes, stats.comments, stats.thumbnail, now, now, isActive, campaign_id, stats.postDate]
    );
    
    // Note: Removed admin/staff notifications for reel submissions to reduce console spam
    
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
      SELECT r.*,r.isActive as "isActive", c.name as campaign_name, c.pay_rate as campaign_pay_rate, c.description as campaign_description, c.status as campaign_status
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
//   min_post_date DATE, -- Minimum date for Instagram posts to be accepted
//   created_at TIMESTAMP DEFAULT NOW()
// );

// --- ADD MIN_POST_DATE TO EXISTING CAMPAIGNS TABLE (run this SQL in your DB) ---
// ALTER TABLE campaigns ADD COLUMN min_post_date DATE;

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

// --- ADD POST_DATE TO REELS TABLE (run this SQL in your DB) ---
// ALTER TABLE reels ADD COLUMN post_date TIMESTAMP;

// --- CAMPAIGNS API ---
// Create a campaign (admin only)
app.post('/api/campaigns', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, pay_rate, total_budget, description, requirements, platform, status, min_post_date } = req.body;
    const result = await pool.query(
      'INSERT INTO campaigns (name, pay_rate, total_budget, description, requirements, platform, status, min_post_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, pay_rate, total_budget, description, requirements, platform, status || 'active', min_post_date || null]
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
          GROUP BY c.id, c.name, c.pay_rate, c.total_budget, c.description, c.requirements, c.platform, c.created_at, c.status, c.min_post_date
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
        GROUP BY c.id, c.name, c.pay_rate, c.total_budget, c.description, c.requirements, c.platform, c.created_at, c.status, c.min_post_date
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
    const { name, pay_rate, total_budget, description, requirements, platform, status, min_post_date } = req.body;
    
    const result = await pool.query(
      'UPDATE campaigns SET name = $1, pay_rate = $2, total_budget = $3, description = $4, requirements = $5, platform = $6, status = $7, min_post_date = $8 WHERE id = $9 RETURNING *',
      [name, pay_rate, total_budget, description, requirements, platform, status, min_post_date || null, campaignId]
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
        c.status as campaign_status,
        c.min_post_date as campaign_min_post_date
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
        status: row.campaign_status,
        min_post_date: row.campaign_min_post_date
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
      SELECT c.id, c.name, c.pay_rate, c.total_budget, c.description, c.requirements, c.platform, c.status, c.created_at, c.min_post_date
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
      { header: 'USDT', key: 'usdt', width: 24 },
      { header: 'UPI', key: 'upi', width: 24 },
      { header: 'PayPal', key: 'paypal', width: 24 },
      { header: 'Estimated Payout', key: 'payout', width: 18 }
    ];
    for (const stat of Object.values(userStats)) {
      sheet.addRow({
        username: stat.username,
        totalViews: stat.totalViews,
        totalVids: stat.totalVids,
        usdt: stat.usdt || '',
        upi: stat.upi || '',
        paypal: stat.paypal || '',
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

// Export campaign leaderboard image (single column)
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
    // Single column layout
    const width = 600;
    const rowHeight = 48;
    const headerHeight = 80;
    const height = headerHeight + leaderboard.length * rowHeight + 40;
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
    // Rankings in single column
    ctx.font = '18px Arial';
    ctx.fillStyle = '#22223b';
    for (let i = 0; i < leaderboard.length; i++) {
      const y = headerHeight + (i + 1) * rowHeight;
      ctx.fillText(`${i + 1}.`, 40, y);
      ctx.fillText(leaderboard[i].username, 120, y);
      ctx.fillText(Number(leaderboard[i].total_views).toLocaleString(), 340, y);
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
        const { name, email, contact, message, date, time, timezone } = req.body; // Added new fields

    const transporter = nodemailer.createTransport({
      service: 'gmail', // Change if using another provider
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

     let subject = 'New Contact Form Submission';
    let emailTextContent = `
      Name: ${name}
      Email: ${email}
      Contact Number: ${contact}
      Message: ${message || 'N/A'}
    `;
    let htmlEmailContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-bottom: 1px solid #ddd;">
          <h2 style="color: #333;">New Message from Contact Form</h2>
        </div>
        <div style="padding: 20px;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Contact Number:</strong> ${contact}</p>
          <p><strong>Message:</strong> ${message || 'N/A'}</p>
        </div>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 0.8em; color: #777; border-top: 1px solid #ddd;">
          This is an automated email, please do not reply directly.
        </div>
      </div>
    `;


    if (date && time && timezone) {
      subject = 'New Appointment Schedule Request';
      emailTextContent = `
        Appointment Request:
        Name: ${name}
        Email: ${email}
        Contact Number: ${contact}
        Preferred Date: ${date}
        Preferred Time: ${time}
        Timezone: ${timezone}
        Message: ${message || 'N/A'}
      `;
      htmlEmailContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #4CAF50; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
          <div style="background-color: #4CAF50; padding: 20px; text-align: center; border-bottom: 1px solid #45a049;">
            <h2 style="color: #fff; margin: 0;">Appointment Schedule Request</h2>
          </div>
          <div style="padding: 20px; background-color: #fff;">
            <p style="font-size: 1.1em; margin-bottom: 15px;">A new appointment has been requested with the following details:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 30%;">Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><a href="mailto:${email}" style="color: #007BFF; text-decoration: none;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Contact Number:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${contact}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Preferred Date:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Preferred Time:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Timezone:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${timezone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Message:</td>
                <td style="padding: 8px 0;">${message || 'N/A'}</td>
              </tr>
            </table>
          </div>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 0.8em; color: #777; border-top: 1px solid #ddd;">
            This is an automated email, please do not reply directly.
          </div>
        </div>
      `;
    }

    // Send mail to admin's email
    await transporter.sendMail({
     from: process.env.SMTP_USER,
      to: process.env.SUPPORT_EMAIL,
      subject: subject,
      text: emailTextContent,
      html: htmlEmailContent,
    });

    
    res.json({ success: true, message: 'Support mail sent successfully.' });
  } catch (error) {
    console.error('Support mail error:', error);
    res.status(500).json({ error: 'Failed to send support mail.' });
  }
});

// Admin: Force update all reels in a campaign with rate limiting
app.post('/api/admin/campaigns/:id/force-update', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const adminId = req.user.id;
    const adminUsername = req.user.username;
    
    // Find all reels for this campaign
    const reelsResult = await pool.query('SELECT * FROM reels WHERE campaign_id = $1', [campaignId]);
    const reels = reelsResult.rows;
    
    if (reels.length === 0) {
      return res.json({ message: 'No reels found for this campaign.' });
    }
    
    // Rate limiting configuration
    const BATCH_SIZE = 35; // Process 35 reels per batch (under the 50 req/min limit)
    const BATCH_DELAY = 60000; // Wait 60 seconds between batches
    
    let updated = 0;
    let errors = [];
    const totalBatches = Math.ceil(reels.length / BATCH_SIZE);
    
    // Send initial response to client
    res.json({ 
      message: `Force update started. Processing ${reels.length} reels in ${totalBatches} batches.`,
      totalReels: reels.length,
      totalBatches,
      batchSize: BATCH_SIZE
    });
    
    // Process reels in batches with rate limiting
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, reels.length);
      const batch = reels.slice(startIndex, endIndex);
      
      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} with ${batch.length} reels`);
      
      // Process current batch
      for (let i = 0; i < batch.length; i++) {
        const reel = batch[i];
        try {
          const stats = await fetchInstagramStatsWithRapidAPI({ url: reel.url, userId: reel.userid });
          await pool.query(
            'UPDATE reels SET views = $1, likes = $2, comments = $3, post_date = $4, lastUpdated = NOW() WHERE id = $5',
            [stats.views, stats.likes, stats.comments, stats.postDate, reel.id]
          );
          updated++;
          
          // Add small delay between requests (1.2 seconds = 50 requests per minute)
          if (i < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1200));
          }
        } catch (err) {
          errors.push({ reelId: reel.id, error: err.message || err.toString() });
          
          // If it's a rate limit error, wait longer before continuing
          if (err.message.includes('Rate limit exceeded')) {
            console.log('Rate limit hit, waiting 2 minutes before continuing...');
            await new Promise(resolve => setTimeout(resolve, 120000));
          }
        }
      }
      
      // Wait before processing next batch (except for the last batch)
      if (batchIndex < totalBatches - 1) {
        console.log(`Waiting ${BATCH_DELAY/1000} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
    
    // Notify the admin about completion
    await pool.query(
      'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
      [adminId, `Force update for campaign ${campaignId} complete. Updated ${updated}/${reels.length} reels.`, 'force_update_done']
    );
    
    console.log(`Force update completed: ${updated} reels updated, ${errors.length} errors`);
    
  } catch (error) {
    console.error('Force update campaign error:', error);
    // Try to notify admin about the error
    try {
      await pool.query(
        'INSERT INTO notifications (user_id, message, type, created_at) VALUES ($1, $2, $3, NOW())',
        [adminId, `Force update for campaign ${campaignId} failed: ${error.message}`, 'force_update_error']
      );
    } catch (notifyError) {
      console.error('Failed to send error notification:', notifyError);
    }
  }
});

// Referral stats endpoint
app.get('/api/referrals', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Get referred users and their campaign-wise earned/claimed amounts
    const referredUsersQuery = `
      SELECT
          u.id AS referred_user_id,
          u.username,
          u.email,
          u.created_at AS created_at,
          u.is_approved AS referred_user_is_approved,
          SUM(CASE WHEN re.status = 'pending' THEN re.earned_amount ELSE 0 END) AS total_earned_from_campaigns,
SUM(CASE WHEN re.status = 'approved' THEN re.claimed_amount ELSE 0 END) AS total_claimed_from_campaigns
      FROM users u
        LEFT JOIN referral_earnings re ON re.referred_id = u.id
      WHERE u.referred_by = $1
      GROUP BY u.id, u.username, u.email, u.created_at, u.is_approved
      ORDER BY u.created_at DESC;
    `;
    const referredUsersResult = await pool.query(referredUsersQuery, [userId]);

    // Calculate total claimed money and pending overall money from all referred users
    const overallReferralSummaryQuery = `
      SELECT
          SUM(CASE WHEN re.status = 'pending' THEN re.earned_amount ELSE 0 END) AS total_earned_from_campaigns,
SUM(CASE WHEN re.status = 'approved' THEN re.claimed_amount ELSE 0 END) AS total_claimed_from_campaigns
      FROM referral_earnings re
      WHERE re.referrer_id = $1 GROUP BY re.referrer_id;
    `;
    const overallSummaryResult = await pool.query(overallReferralSummaryQuery,[userId]);

    // Get the referral code for the current user
    const referralCodeResult = await pool.query('SELECT referral_code FROM users WHERE id = $1', [userId]);

    res.json({
      referralCode: referralCodeResult.rows[0]?.referral_code,
      totalReferredUsers: Number(referredUsersResult.rows?.length || 0),
      totalEarningsAllTime: Number(overallSummaryResult.rows[0]?.total_earned_from_campaigns || 0),
      totalClaimedOverall: Number(overallSummaryResult.rows[0]?.total_claimed_from_campaigns || 0),
      referredUsers: referredUsersResult.rows
    });

  } catch (error) {
    console.error('Error fetching referral data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/referral-claims', authenticateToken, async (req, res) => {
  const referrerId = req.user.id; // The user making the claim request

  try {
    // 1. Calculate the total unclaimed earnings for the referrer
    const unclaimedEarningsResult = await pool.query(`
      SELECT
          SUM(CASE WHEN re.status = 'pending' THEN re.earned_amount ELSE 0 END) AS total_earned_from_campaigns,
SUM(CASE WHEN re.status = 'approved' THEN re.claimed_amount ELSE 0 END) AS total_claimed_from_campaigns
      FROM referral_earnings re 
      WHERE re.referrer_id = $1 GROUP BY re.referrer_id;
    `, [referrerId]);

    const unclaimedAmount = Number(unclaimedEarningsResult.rows[0]?.total_earned_from_campaigns || 0);

    if (unclaimedAmount <= 100) {
      return res.status(400).json({ message: 'Unclaimed earning is less than $100. You can not claim it.' });
    }

    // 2. Check for existing pending claims to prevent duplicates
    const existingPendingClaim = await pool.query(`
      SELECT id FROM referral_claims
      WHERE referrer_id = $1 AND status = 'pending';
    `, [referrerId]);

    if (existingPendingClaim.rows.length > 0) {
      return res.status(409).json({ message: 'You already have a pending claim request.' });
    }

    // 3. Insert a new referral claim request
    const newClaim = await pool.query(`
      INSERT INTO referral_claims (referrer_id, status, request_date)
      VALUES ($1, 'pending', NOW())
      RETURNING id, request_date;
    `, [referrerId]);

    res.status(201).json({
      message: 'Referral claim request submitted successfully.',
      claimId: newClaim.rows[0].id,
      requestDate: newClaim.rows[0].request_date,
      requestedAmount: unclaimedAmount // Inform the user about the amount for which the request was made
    });

  } catch (error) {
    console.error('Error submitting referral claim request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/admin/referral-claims', authenticateToken, async (req, res) => {
  try {
    const claims = await pool.query(`
      SELECT
          rc.id,
          rc.referrer_id,
          u.username AS referrer_username,
          u.email AS referrer_email,
          rc.status,
          rc.request_date,
          rc.approval_date,
          rc.rejection_reason,
          au.username AS approved_by_username 
      FROM referral_claims rc
      JOIN users u ON rc.referrer_id = u.id
      JOIN referral_earnings re ON re.referrer_id = rc.referrer_id AND rc.status = 'pending'
      ORDER BY rc.request_date DESC;
    `);

    res.json({
      allClaimRequests: claims.rows
    });

  } catch (error) {
    console.error('Error fetching all referral claim requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/api/admin/referral-claims/:id', authenticateToken, async (req, res) => {
  const claimId = req.params.id;
  const { status, rejectionReason } = req.body; // status can be 'approved' or 'rejected'
  const approvedBy = req.user.id; // The admin/staff user approving/rejecting

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status provided. Must be "approved" or "rejected".' });
  }

  const client = await pool.connect(); // Use a client for transaction
  try {
    await client.query('BEGIN'); // Start transaction

    // 1. Fetch the existing claim to ensure it's pending
    const existingClaimResult = await client.query(`
      SELECT referrer_id, status FROM referral_claims WHERE id = $1 FOR UPDATE;
    `, [claimId]); // FOR UPDATE locks the row

    if (existingClaimResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Referral claim not found.' });
    }

    const existingClaim = existingClaimResult.rows[0];
    if (existingClaim.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Claim is already ${existingClaim.status}. Cannot update.` });
    }

    // 2. Update the referral claim status
    let updateQuery;
    let queryParams;

    if (status === 'approved') {
      updateQuery = `
        UPDATE referral_claims
        SET status = 'approved', approval_date = NOW(), approved_by = $2, rejection_reason = NULL
        WHERE id = $1
        RETURNING *;
      `;
      queryParams = [claimId, approvedBy];
    } else {
      if (!rejectionReason || rejectionReason.trim() === '') {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Rejection reason is required for rejected claims.' });
      }
      updateQuery = `
        UPDATE referral_claims
        SET status = 'rejected', approval_date = NOW(), approved_by = $2, rejection_reason = $3
        WHERE id = $1
        RETURNING *;
      `;
      queryParams = [claimId, approvedBy, rejectionReason];
    }

    const updatedClaimResult = await client.query(updateQuery, queryParams);
    const updatedClaim = updatedClaimResult.rows[0];

    if (status === 'approved') {
      await client.query(`
        UPDATE referral_earnings
        SET claimed_amount = earned_amount
        WHERE referrer_id = $1 AND claimed_amount < earned_amount and status= $2;
      `, [existingClaim.referrer_id,'pending']);

    }

    await client.query('COMMIT');
    res.json({
      message: `Referral claim ${status} successfully.`,
      updatedClaim: updatedClaim
    });

  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error('Error updating referral claim status:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
});



const formatDateTime=(date)=> {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = String(hours).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
}

const sendEmail = async (to, subject, text, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: to,
      subject: subject,
      html: html,
    };
    if(text) {
      mailOptions.text = text;
    }

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Mail error:', error);
  }

  
}



app.post('/api/admin/send-campaign-earnings-emails', async (req, res) => { 
  try { 
    const MIN_VIEWS_REQUIRED = 1000000; // 1 Million views
    const {id}=req.body;

    // 1. Get all active campaigns with their per_1m_views_price
    const campaignsResult = await pool.query('SELECT id, name, pay_rate as per_1m_views_price FROM campaigns WHERE status = $1 AND id = $2', ['active',id]); 
    const campaigns = campaignsResult.rows; 

    if (campaigns.length === 0) { 
      return res.status(200).json({ message: 'No active campaigns with earnings configured.' }); 
    }

    let emailsSentCount = 0; 
    let usersProcessed = new Set(); // To track users already processed to avoid duplicate emails

    for (const campaign of campaigns) { 
      // 2. Get users who submitted reels for this campaign and their total views
      const usersReelViewsResult = await pool.query( 
        `SELECT r.userId, SUM(r.views) AS total_views, u.email, u.username,u.id,u.referred_by
         FROM reels r
         JOIN public.users u ON r.userId = u.id
         WHERE r.campaign_id = $1 AND (r.is_dummy = false OR r.is_dummy IS NULL)
         GROUP BY r.userId, u.email, u.username, u.id
         HAVING SUM(r.views) >= $2`,
        [campaign.id, MIN_VIEWS_REQUIRED]
      ); 

      const eligibleUsers = usersReelViewsResult.rows; 

      if (eligibleUsers.length === 0) { 
        console.log(`No users met the minimum view requirement for campaign: ${campaign.name}`); 
        continue; 
      }

      for (const user of eligibleUsers) { 
        if (usersProcessed.has(user.email)) { 
            console.log(`User ${user.email} already processed for another campaign in this batch. Skipping.`); 
            continue; 
        }

        const totalViews = parseInt(user.total_views, 10); 
        // Calculate earnings: (total views / 1,000,000) * per_1m_views_price
        const earnedAmount = (totalViews / MIN_VIEWS_REQUIRED) * parseFloat(campaign.per_1m_views_price); 

        const twelvePercent = earnedAmount * 0.12;


        if (user.referred_by) {
          const eightPercentReferral = earnedAmount * 0.08;

          try {
            await pool.query(
              `INSERT INTO referral_earnings (referrer_id, referred_id, created_at, earned_amount, claimed_amount, campaign_id)
               VALUES ($1, $2, NOW(), $3, 0, $4)`, 
              [user.referred_by, user.id, eightPercentReferral, campaign.id]
            );
            } catch (referralError) {
            console.error(`Error adding referral earning for referrer ${user.referrerId}:`, referralError);
          }
        }

        try { 
          await sendEmail(user.email,`Campaign Earnings Invoice For: ${campaign.name}`,'',`<!DOCTYPE html>
<html>
<head>
  <title>Campaign Earnings Invoice</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <style type="text/css">
    /* CLIENT-SPECIFIC STYLES */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }

    /* RESET STYLES */
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

    /* iOS BLUE LINKS */
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    /* Universal styles for consistent appearance */
    body {
      font-family: 'Arial', sans-serif;
      color: #333;
      font-size: 14px;
    }
    .container {
      width: 100%;
      max-width: 600px; /* Reduced max-width for better mobile fit */
      margin: 0 auto;
      background-color: #ffffff; /* Added background for clarity */
    }
    .header-table {
        width: 100%;
        padding: 20px; /* Added padding to header cells instead of container */
    }
    .logo-section img {
        width: 100px; /* Adjusted size */
        height: auto;
        display: block; /* Important for alignment */
    }
    .invoice-details {
        text-align: right; /* Align right for desktop, will stack on mobile */
        font-size: 12px;
    }
    .invoice-details p {
        margin: 2px 0;
    }
    .invoice-title {
        font-size: 24px;
        letter-spacing: 3px;
        font-weight: bold;
        margin-bottom: 5px;
    }
    .section-title {
        font-weight: bold;
        margin-bottom: 5px;
        font-size: 15px;
    }
    .invoice-to-table {
        width: 100%;
        margin-bottom: 20px;
        padding: 0 20px; /* Added padding */
    }
    .invoice-to-content p {
        margin: 2px 0;
    }
    .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        background-color: #ffffff;
    }
    .items-table thead {
        background-color: #000;
        color: #fff;
    }
    .items-table th, .items-table td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #eee;
    }
    .items-table th.align-right, .items-table td.align-right {
        text-align: right;
    }
    .items-table tr:last-child td { border-bottom: none; }

    .summary-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        padding: 0 20px; /* Added padding */
    }
    .summary-table td {
        padding: 5px 0;
        font-size: 15px;
        text-align: right;
    }
    .summary-label {
        font-weight: bold;
        padding-right: 15px;
    }
    .total-row td {
        background-color: #000;
        color: #fff;
        font-weight: bold;
        font-size: 18px;
        padding: 10px 20px; /* Increased padding for total */
    }
    .footer-table {
        width: 100%;
        margin-top: 40px;
        padding: 0 20px; /* Added padding */
    }
    .thank-you {
        font-weight: 500;
        font-size: 16px;
    }
    .signature-section {
        text-align: right;
    }
    .signature-section img {
        max-width: 120px; /* Adjusted size */
        height: auto;
        display: block;
        margin-left: auto;
        margin-right: 0;
        margin-bottom: 5px;
    }
    .company-name-footer {
        font-weight: bold;
        font-size: 14px;
    }

    /* Mobile specific styles */
    @media screen and (max-width: 525px) {
      .container {
        width: 100% !important;
        padding: 10px !important; /* Adjust padding for smaller screens */
      }
      .header-table td {
          display: block !important;
          width: 100% !important;
          text-align: center !important;
      }
      .invoice-details {
          text-align: center !important;
          margin-top: 20px;
      }
      .items-table th, .items-table td {
          padding: 8px 10px !important;
      }
      /* Stack summary and total on small screens */
      .summary-table, .total-row {
          width: 100% !important;
      }
      .summary-table td, .total-row td {
          display: block !important;
          width: 100% !important;
          text-align: center !important;
      }
      .summary-label {
          padding-right: 0 !important;
          margin-bottom: 5px;
      }
      .footer-table td {
          display: block !important;
          width: 100% !important;
          text-align: center !important;
      }
      .signature-section {
          text-align: center !important;
          margin-top: 30px;
      }
      .signature-section img {
          margin-left: auto !important;
          margin-right: auto !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="container" style="max-width: 600px; background-color: #ffffff;">
          <tr>
            <td style="padding: 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="header-table">
                <tr>
                  <td class="logo-section" valign="top" style="width: 50%; padding-right: 10px;">
                    <img src="https://lh3.googleusercontent.com/d/1pdrEVX-VdyNHBW44agR508G1mcYWfXh9" alt="DLS Group Logo" style="display: block; width: 100px; max-width: 100px; height: auto;">
                  </td>
                  <td class="invoice-details" valign="top" style="width: 50%; text-align: right;">
                    <p class="invoice-title">INVOICE</p>
                    <p class="invoice-subheading">Invoice ID: INV-DLS${campaign.id}INV${user.id}</p>
                    <p class="invoice-subheading">Invoice Date: ${formatDateTime(new Date())}</p>
                  </td>
                </tr>
              </table>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="invoice-to-table">
                <tr>
                  <td class="invoice-to-content" style="padding-top: 20px;">
                    <p class="section-title">INVOICE TO:</p>
                    <p>${user.email}</p> </td>
                </tr>
              </table>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="items-table">
                <thead>
                  <tr>
                    <th style="padding: 12px 15px; background-color: #000; color: #fff; text-align: left;">PRODUCT</th>
                    <th style="padding: 12px 15px; background-color: #000; color: #fff; text-align: left;">PRICE</th>
                    <th style="padding: 12px 15px; background-color: #000; color: #fff; text-align: left;">VIEWS</th>
                    <th class="align-right" style="padding: 12px 15px; background-color: #000; color: #fff; text-align: right;">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">${campaign.name}</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">$${parseFloat(campaign.per_1m_views_price).toFixed(2)} / M Views</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">${user.total_views.toLocaleString()}</td>
                    <td class="align-right" style="padding: 12px 15px; border-bottom: 1px solid #eee;">$${earnedAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                      <td  style="padding: 5px 15px; border-bottom: 1px solid #eee; font-size: 12px;">Website Maintenance Fee </td>
                      <td>-4.8%</td>
                      <td></td>
                      <td class="align-right" style="padding: 5px 15px; border-bottom: 1px solid #eee; font-size: 12px;">-$${(earnedAmount * 0.048).toFixed(2)}</td>
                  </tr>
                  <tr>
                      <td style="padding: 5px 15px; border-bottom: 1px solid #eee; font-size: 12px;">Service Tax </td>
                       <td>-4%</td>
                      <td></td>
                      <td class="align-right" style="padding: 5px 15px; border-bottom: 1px solid #eee; font-size: 12px;">-$${(earnedAmount * 0.04).toFixed(2)}</td>
                  </tr>
                  <tr>
                      <td style="padding: 5px 15px; border-bottom: 1px solid #eee; font-size: 12px;">Currency Conversion Fee </td>
                       <td>-3.2%</td>
                      <td></td>
                      <td class="align-right" style="padding: 5px 15px; border-bottom: 1px solid #eee; font-size: 12px;">-$${(earnedAmount * 0.032).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="summary-table">
                <tr>
                  <td class="summary-label" style="text-align: right; font-weight: bold; padding-right: 15px;">SUB-TOTAL:</td>
                  <td class="summary-value" style="text-align: right; font-weight: bold;">$${earnedAmount.toFixed(2)}</td>
                </tr>
                <tr style="padding-bottom: 20px;">
                  <td class="summary-label" style="text-align: right; font-weight: bold; padding-right: 15px;">TOTAL DEDUCTIONS (-12%):</td>
                  <td class="summary-value" style="text-align: right; font-weight: bold;">-$${twelvePercent.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td class="summary-label" style="background-color: #000; color: #fff; font-weight: bold; font-size: 18px; padding: 10px 20px;">TOTAL PAYABLE:</td>
                  <td class="summary-value" style="background-color: #000; color: #fff; font-weight: bold; font-size: 18px; padding: 10px 20px;">$${(earnedAmount - twelvePercent).toFixed(2)}</td>
                </tr>
              </table>


              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="footer-table" style="margin-top: 20px;">
                <tr>
                  <td valign="bottom" style="width: 50%; padding-right: 10px;">
                    <p class="thank-you" style="font-weight: 500; font-size: 16px;">Thank You For Your Business</p>
                  </td>
                  <td class="signature-section" valign="bottom" style="width: 50%; text-align: right;">
                    <img src="https://lh3.googleusercontent.com/d/1mqzgHmpNb3cF6ESKZNG-DGXOAUQFOJ_p" alt="Authorized Signature" style="max-width: 120px; height: auto; display: block; margin-left: auto; margin-right: 0; margin-bottom: 5px;">
                    <hr style="border: none; border-top: 1px solid #333; margin: 0 0 5px 0;">
                    <p class="company-name-footer" style="font-weight: bold; font-size: 14px;">DLS GROUP</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
        </td>
    </tr>
  </table>
</body>
</html>`); 
          console.log(`Email sent successfully to ${user.email} for campaign ${campaign.name}. Earned: $${earnedAmount.toFixed(2)}`); 
          emailsSentCount++; 
          usersProcessed.add(user.email); 
        } catch (mailError) { 
          console.error(`Failed to send email to ${user.email} for campaign ${campaign.name}:`, mailError); 
        }
      }
    }

    res.json({ success: true, message: `Successfully processed and sent ${emailsSentCount} earning reports.` }); 

  } catch (error) {
    console.error('Error sending campaign earnings emails:', error); 
    res.status(500).json({ success: false, message: 'Failed to send campaign earnings emails.', error: error.message }); 
  }
});

