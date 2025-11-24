const db = require('./src/lib/db');

async function createChallenges() {
    await db.initialize();

    console.log('🎯 Creating challenges...\n');

    const challenges = [
        {
            title: '🚶 Marche Quotidienne',
            description: 'Fais 10,000 pas aujourd\'hui',
            type: 'daily_steps',
            target: 10000,
            reward: 100,
            difficulty: 'easy',
            duration: 1
        },
        {
            title: '🏃 Sprint Marathon',
            description: 'Atteins 50,000 pas en une semaine',
            type: 'duration_steps',
            target: 50000,
            reward: 500,
            difficulty: 'medium',
            duration: 7
        },
        {
            title: '⚡ Super Marcheur',
            description: 'Fais 25,000 pas en un jour',
            type: 'daily_steps',
            target: 25000,
            reward: 300,
            difficulty: 'hard',
            duration: 1
        },
        {
            title: '🔥 Défi Ultime',
            description: 'Atteins 100,000 pas en 30 jours',
            type: 'duration_steps',
            target: 100000,
            reward: 1000,
            difficulty: 'hard',
            duration: 30
        }
    ];

    for (const challenge of challenges) {
        const result = await db.run(`
      INSERT INTO challenges (title, description, type, target, reward, difficulty, duration, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [
            challenge.title,
            challenge.description,
            challenge.type,
            challenge.target,
            challenge.reward,
            challenge.difficulty,
            challenge.duration
        ]);

        console.log(`✅ Created: ${challenge.title} (ID: ${result.lastID})`);
    }

    console.log('\n🎉 All challenges created!');
    console.log('\nVerifying...');

    const allChallenges = await db.all('SELECT id, title, type, target, reward FROM challenges');
    console.table(allChallenges);

    process.exit(0);
}

createChallenges().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
