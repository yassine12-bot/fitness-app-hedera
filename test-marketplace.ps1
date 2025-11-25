require('dotenv').config();
const db = require('./src/lib/db');

async function addFIT() {
  const email = 'labrim99@gmail.com';
  const amount = 100;
  
  try {
    await db.initialize();
    
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) {
      console.log('❌ User not found with email:', email);
      return;
    }
    
    console.log(`📍 Found user: ${user.name}`);
    console.log(`💰 Current balance: ${user.fitBalance} FIT`);
    
    await db.run(
      'UPDATE users SET fitBalance = fitBalance + ? WHERE email = ?',
      [amount, email]
    );
    
    const updated = await db.get('SELECT fitBalance FROM users WHERE email = ?', [email]);
    
    console.log('✅ FIT Added!');
    console.log(`💰 New Balance: ${updated.fitBalance} FIT (+${amount})`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addFIT();