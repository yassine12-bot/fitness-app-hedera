require('dotenv').config();
const db = require('./src/lib/db');

async function quickFix() {
  await db.initialize();
  
  console.log('Adding updatedAt column...');
  await db.run('ALTER TABLE users ADD COLUMN updatedAt DATETIME');
  console.log('✅ Done');
  
  console.log('\nChecking user 0.0.7317363...');
  const user = await db.get('SELECT * FROM users WHERE hederaAccountId = ?', ['0.0.7317363']);
  
  if (user) {
    console.log('✅ User exists');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   totalSteps: ${user.totalSteps}`);
  } else {
    console.log('❌ User NOT found with hederaAccountId 0.0.7317363');
  }
  
  console.log('\nRestart backend: npm start');
}

quickFix().catch(console.error);