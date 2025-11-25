require('dotenv').config();
const db = require('./src/lib/db');

async function addColumn() {
  await db.initialize();
  
  console.log('Adding hederaTxId to workouts...');
  await db.run('ALTER TABLE workouts ADD COLUMN hederaTxId TEXT');
  console.log('✅ Done');
  
  console.log('\nRestart backend: npm start');
}

addColumn().catch(console.error);