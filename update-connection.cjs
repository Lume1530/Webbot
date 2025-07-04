const fs = require('fs');
const path = require('path');

console.log('🔧 Database Connection String Updater');
console.log('=====================================\n');

console.log('📋 Instructions:');
console.log('1. Go to your Supabase Dashboard');
console.log('2. Navigate to Settings → Database');
console.log('3. Copy the "URI" connection string');
console.log('4. Paste it below\n');

// Read the current server file
const serverPath = path.join(__dirname, 'server', 'index.cjs');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Show current connection string
const currentMatch = serverContent.match(/connectionString:\s*'([^']+)'/);
if (currentMatch) {
  console.log('Current connection string:');
  console.log(currentMatch[1]);
  console.log('\n❌ This hostname is incorrect!\n');
}

console.log('Please provide the correct connection string from Supabase:');
console.log('Format: postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres\n');

// For now, let's create a template with placeholder
const templateConnection = 'postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT_REF.supabase.co:5432/postgres';

console.log('📝 Template (replace with your actual values):');
console.log(templateConnection);
console.log('\n⚠️  Please update the connection string in server/index.cjs manually');
console.log('   Replace the current connectionString with your correct one from Supabase dashboard'); 