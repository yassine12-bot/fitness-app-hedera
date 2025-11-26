require('dotenv').config();
const fitnessContract = require('./src/lib/fitness-contract');

async function checkYourProgress() {
    console.log('\n🔍 Checking YOUR Progress (labrim99@gmail.com)\n');
    console.log('='.repeat(60));

    try {
        await fitnessContract.initialize();

        // YOUR account!
        const yourAccount = '0.0.7309024';

        console.log(`\n👤 User: labrim99@gmail.com`);
        console.log(`   Hedera Account: ${yourAccount}\n`);

        // Get total steps
        const totalSteps = await fitnessContract.getTotalSteps(yourAccount);
        console.log(`📊 Total Steps: ${totalSteps}`);

        // Get user level
        const userLevel = await fitnessContract.getUserLevel(yourAccount);
        console.log(`⭐ User Level: ${userLevel}`);

        // Check progress for level 1 challenges (5 challenges)
        console.log(`\n🎯 Level 1 Challenge Progress:\n`);

        for (let i = 1; i <= 15; i++) {
            const challenge = await fitnessContract.getChallenge(i);

            if (challenge.level === 1) {
                const progress = await fitnessContract.getChallengeProgress(yourAccount, i);
                const completed = await fitnessContract.isChallengeCompleted(yourAccount, i);

                console.log(`Challenge ${i}:`);
                console.log(`   Target: ${challenge.target} steps`);
                console.log(`   Progress: ${progress}/${challenge.target}`);
                console.log(`   Percent: ${Math.floor((progress / challenge.target) * 100)}%`);
                console.log(`   Completed: ${completed ? '✅ YES' : '❌ NO'}`);
                console.log('');
            }
        }

        console.log('='.repeat(60));

        if (totalSteps > 0) {
            console.log(`\n✅ You have ${totalSteps} steps logged!`);
            console.log('   Progress should show in the frontend now.');
        } else {
            console.log('\n⚠️  You have 0 steps!');
            console.log('   Try logging steps using the StepSimulator.');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    }
}

checkYourProgress();
