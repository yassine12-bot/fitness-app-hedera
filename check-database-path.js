require('dotenv').config();
const path = require('path');
const fs = require('fs');

console.log('='.repeat(80));
console.log('🔍 DATABASE PATH CHECK');
console.log('='.repeat(80));
console.log('');

// Check .env
console.log('📋 Environment Variables:');
console.log(`   DATABASE_PATH: ${process.env.DATABASE_PATH || '(not set)'}`);
console.log('');

// Check what db.js uses
const dbPath1 = process.env.DATABASE_PATH || path.resolve(__dirname, 'data.db');
const dbPath2 = process.env.DATABASE_PATH || path.resolve(__dirname, '../data.db');
const dbPath3 = process.env.DATABASE_PATH || './data.db';

console.log('📁 Possible database locations:');
console.log(`   1. ${dbPath1}`);
console.log(`      Exists: ${fs.existsSync(dbPath1) ? '✅' : '❌'}`);
console.log('');
console.log(`   2. ${dbPath2}`);
console.log(`      Exists: ${fs.existsSync(dbPath2) ? '✅' : '❌'}`);
console.log('');
console.log(`   3. ${dbPath3}`);
console.log(`      Exists: ${fs.existsSync(dbPath3) ? '✅' : '❌'}`);
console.log('');

// Check project root
const rootDb = path.resolve(__dirname, 'data.db');
console.log(`   Project root: ${rootDb}`);
console.log(`      Exists: ${fs.existsSync(rootDb) ? '✅' : '❌'}`);
console.log('');

// Find all data.db files
console.log('🔎 Searching for all data.db files...');
const locations = [
  './data.db',
  './src/data.db',
  '../data.db',
  'data.db'
];

locations.forEach(loc => {
  const fullPath = path.resolve(loc);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    console.log(`   ✅ Found: ${fullPath}`);
    console.log(`      Size: ${stats.size} bytes`);
    console.log(`      Modified: ${stats.mtime.toISOString()}`);
    console.log('');
  }
});

console.log('💡 SOLUTION:');
console.log('   1. Check your .env file');
console.log('   2. Look for DATABASE_PATH=...');
console.log('   3. Or check src/lib/db.js to see what path it uses');
console.log('');
console.log('='.repeat(80));