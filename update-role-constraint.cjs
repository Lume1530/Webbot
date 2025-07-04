require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateRoleConstraint() {
  try {
    console.log('🔄 Updating role constraint to allow "staff" role...');
    
    // Drop existing constraint
    await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
    console.log('✅ Dropped existing constraint');
    
    // Add new constraint with 'staff' role
    await pool.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('user', 'admin', 'staff'))
    `);
    console.log('✅ Added new constraint with staff role');
    
    // Verify the change
    const constraintResult = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass AND conname = 'users_role_check'
    `);
    
    console.log('✅ Constraint updated successfully!');
    console.log('New constraint:', constraintResult.rows[0].pg_get_constraintdef);
    
    // Test creating a staff user
    console.log('\n🧪 Testing staff user creation...');
    const testResult = await pool.query(`
      INSERT INTO users (username, email, password_hash, role, is_approved) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (username) DO NOTHING
      RETURNING id, username, role
    `, ['test_staff', 'test_staff@example.com', 'test_hash', 'staff', true]);
    
    if (testResult.rows.length > 0) {
      console.log('✅ Test staff user created successfully!');
      // Clean up test user
      await pool.query('DELETE FROM users WHERE username = $1', ['test_staff']);
      console.log('✅ Test user cleaned up');
    } else {
      console.log('ℹ️ Test user already exists (this is fine)');
    }
    
  } catch (error) {
    console.error('❌ Error updating role constraint:', error.message);
  } finally {
    await pool.end();
  }
}

updateRoleConstraint(); 