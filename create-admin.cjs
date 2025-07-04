require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully!');

    const adminData = {
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123'
    };

    // Check if admin already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [adminData.username, adminData.email]
    );

    if (existingUser.rows.length > 0) {
      console.log('❌ Admin user already exists');
      return;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminData.password, saltRounds);

    // Create admin user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, is_approved) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, is_approved, created_at',
      [adminData.username, adminData.email, passwordHash, 'admin', true]
    );

    console.log('✅ Admin user created successfully!');
    console.log('Username:', adminData.username);
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    console.log('Role: admin');
    console.log('Approved: true');

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin(); 