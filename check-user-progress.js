require('dotenv').config();
const fitnessContract = require('./src/lib/fitness-contract');

async function checkUserProgress() {
    console.log('\n🔍 Checking User Progress\n');
    console.log('='.repeat(60));

    try {
        await fitnessContract.initialize();

        // Check with the operator account (the one that logs steps)
        const userAccount = '0.0.5425861'; // Your operator account

        console.log(`\n👤 User: ${userAccount}\n`);

        // Get total steps
        const totalSteps = await fitnessContract.getTotalSteps(userAccount);
        console.log(`📊 Total Steps: ${totalSteps}`);

        // Get user level
        const userLevel = await fitnessContract.getUserLevel(userAccount);
        console.log(`⭐ User Level: ${userLevel}`);

        // Check progress for all 15 challenges
        console.log(`\n🎯 Challenge Progress:\n`);

        for (let i = 1; i <= 15; i++) {
            const progress = await fitnessContract.getChallengeProgress(userAccount, i);
            const completed = await fitnessContract.isChallengeCompleted(userAccount, i);
            const challenge = await fitnessContract.getChallenge(i);

            if (progress > 0 || completed) {
                console.log(`Challenge ${i}:`);
                console.log(`   Target: ${challenge.target}`);
                console.log(`   Progress: ${progress}/${challenge.target}`);
                console.log(`   Percent: ${Math.floor((progress / challenge.target) * 100)}%`);
                console.log(`   Completed: ${completed ? '✅' : '❌'}`);
                console.log('');
            }
        }

        console.log('='.repeat(60));

        if (totalSteps === 0) {
            console.log('\n⚠️  You have 0 steps logged!');
            console.log('   This means either:');
            console.log('   1. Steps were logged to a DIFFERENT contract');
            console.log('   2. Steps were never logged to the blockchain');
            console.log('   3. You need to log steps using /api/workouts/steps');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

checkUserProgress();
