const fitnessContract = require('./src/lib/fitness-contract');

async function addChallenges() {
    console.log('🎯 Adding challenges to FitnessContract...\n');

    await fitnessContract.initialize();

    const challenges = [
        {
            title: '🚶 Daily Walker',
            type: 'daily_steps',
            target: 10000,
            reward: 100,
            level: 1
        },
        {
            title: '🏃 Sprint Master',
            type: 'daily_steps',
            target: 25000,
            reward: 300,
            level: 2
        },
        {
            title: '⚡ Weekly Challenge',
            type: 'duration_steps',
            target: 50000,
            reward: 500,
            level: 1
        },
        {
            title: '🔥 Ultimate Warrior',
            type: 'duration_steps',
            target: 100000,
            reward: 1000,
            level: 3
        }
    ];

    for (const challenge of challenges) {
        try {
            console.log(`Adding: ${challenge.title}...`);
            const result = await fitnessContract.addChallenge(challenge);
            console.log(`✅ Added! TX: ${result.transactionId}\n`);
        } catch (error) {
            console.error(`❌ Error adding ${challenge.title}:`, error.message);
        }
    }

    // Verify
    console.log('\n📊 Verifying challenges...');
    const count = await fitnessContract.getChallengeCount();
    console.log(`Total challenges: ${count}`);

    for (let i = 1; i <= count; i++) {
        const challenge = await fitnessContract.getChallenge(i);
        console.log(`  ${i}. ${challenge.title} - ${challenge.target} steps = ${challenge.reward} FIT`);
    }

    console.log('\n✅ Done!');
    process.exit(0);
}

addChallenges().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
