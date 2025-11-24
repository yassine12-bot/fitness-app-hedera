const db = require('./src/lib/db');

async function fixIssues() {
    await db.initialize();

    console.log('🔧 Fixing frontend issues...\n');

    // 1. Make user admin
    console.log('1️⃣ Making labrim99@gmail.com admin...');
    await db.run('UPDATE users SET isAdmin = 1 WHERE email = ?', ['labrim99@gmail.com']);

    const user = await db.get('SELECT id, name, email, isAdmin FROM users WHERE email = ?', ['labrim99@gmail.com']);
    console.log('✅ User:', JSON.stringify(user, null, 2));

    // 2. Check tables
    console.log('\n2️⃣ Checking database tables...');
    const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
    console.log('Tables:', tables.map(t => t.name).join(', '));

    // 3. Check if challenges table exists
    const hasChallenges = tables.some(t => t.name === 'challenges');
    console.log(`\n3️⃣ Challenges table exists: ${hasChallenges}`);

    console.log('\n✅ Done! Restart both servers.');
    process.exit(0);
}

fixIssues().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
