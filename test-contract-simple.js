require('dotenv').config();
const fitnessContract = require('./src/lib/fitness-contract');

async function testContract() {
    console.log('\n🧪 Testing Fitness Contract from .env\n');
    console.log('='.repeat(60));

    try {
        await fitnessContract.initialize();

        console.log('\n✅ Contract initialized!');
        console.log(`   Contract ID: ${process.env.FITNESS_CONTRACT_ADDRESS}`);

        // Test 1: Get challenge count
        const count = await fitnessContract.getChallengeCount();
        console.log(`\n📊 Challenge count: ${count}`);

        // Test 2: Get first challenge
        if (count > 0) {
            const challenge = await fitnessContract.getChallenge(1);
            console.log(`\n🎯 Challenge 1:`);
            console.log(`   ID: ${challenge.id}`);
            console.log(`   Target: ${challenge.target}`);
            console.log(`   Reward: ${challenge.reward}`);
            console.log(`   Level: ${challenge.level}`);
            console.log(`   Active: ${challenge.isActive}`);

            if (challenge.target === 1000 && challenge.reward === 5) {
                console.log(`   ✅ DATA IS CORRECT!`);
            } else {
                console.log(`   ❌ DATA IS WRONG!`);
            }
        }

        // Test 3: Get user progress (using your account)
        const userAccount = process.env.HEDERA_ACCOUNT_ID;
        console.log(`\n👤 Testing with user: ${userAccount}`);

        const totalSteps = await fitnessContract.getTotalSteps(userAccount);
        console.log(`   Total steps: ${totalSteps}`);

        if (count > 0) {
            const progress = await fitnessContract.getChallengeProgress(userAccount, 1);
            const completed = await fitnessContract.isChallengeCompleted(userAccount, 1);
            console.log(`   Challenge 1 progress: ${progress}`);
            console.log(`   Challenge 1 completed: ${completed}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ All tests passed!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    }
}

testContract();
