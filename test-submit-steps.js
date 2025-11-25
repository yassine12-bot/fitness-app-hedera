require('dotenv').config();
const fitnessContract = require('./src/lib/fitness-contract');
const cacheSync = require('./src/lib/cache-sync');

/**
 * Test Step Submission Flow
 * 
 * Tests:
 * 1. Add steps to blockchain
 * 2. Verify challenge progress
 * 3. Complete a challenge
 * 4. Receive reward
 */

async function testSteps() {
  console.log('🧪 Testing Step Submission\n');
  console.log('='.repeat(60));

  const testUser = process.env.HEDERA_ACCOUNT_ID;
  console.log(`\n👤 Test User: ${testUser}`);

  try {
    // Initialize
    await fitnessContract.initialize();

    // Get initial state
    console.log('\n📊 BEFORE:');
    const beforeSteps = await fitnessContract.getTotalSteps(testUser);
    const beforeProgress = await fitnessContract.getChallengeProgress(testUser, 1);
    const beforeCompleted = await fitnessContract.isChallengeCompleted(testUser, 1);
    
    console.log(`   Total steps: ${beforeSteps}`);
    console.log(`   Challenge 1 progress: ${beforeProgress}`);
    console.log(`   Challenge 1 completed: ${beforeCompleted}`);

    // Get challenge 1 details
    const challenge1 = await fitnessContract.getChallenge(1);
    console.log(`\n🎯 Challenge 1 Details:`);
    console.log(`   Target: ${challenge1.target}`);
    console.log(`   Reward: ${challenge1.reward} FIT`);
    console.log(`   Level: ${challenge1.level}`);

    // Add steps
    const stepsToAdd = 500;
    console.log(`\n📈 Adding ${stepsToAdd} steps...`);
    
    const result = await fitnessContract.updateSteps(testUser, stepsToAdd);
    console.log(`   ✅ Success! Transaction: ${result.transactionId}`);

    // Wait a moment for blockchain to update
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get new state
    console.log('\n📊 AFTER:');
    const afterSteps = await fitnessContract.getTotalSteps(testUser);
    const afterProgress = await fitnessContract.getChallengeProgress(testUser, 1);
    const afterCompleted = await fitnessContract.isChallengeCompleted(testUser, 1);
    
    console.log(`   Total steps: ${afterSteps} (+${afterSteps - beforeSteps})`);
    console.log(`   Challenge 1 progress: ${afterProgress} (+${afterProgress - beforeProgress})`);
    console.log(`   Challenge 1 completed: ${afterCompleted}`);

    // Check if challenge completed
    if (afterCompleted && !beforeCompleted) {
      console.log('\n🎉 CHALLENGE COMPLETED!');
      console.log(`   You should receive ${challenge1.reward} FIT tokens!`);
      console.log(`   Check your balance: node scripts/check-balance.js`);
    } else if (afterProgress >= challenge1.target && !afterCompleted) {
      console.log('\n⚠️  Progress met target but challenge not marked complete!');
      console.log('   This might indicate an issue with the contract logic.');
    } else {
      console.log(`\n📌 Progress: ${afterProgress}/${challenge1.target}`);
      console.log(`   Need ${challenge1.target - afterProgress} more steps to complete!`);
    }

    // Sync to cache
    console.log('\n🔄 Syncing to cache...');
    await cacheSync.syncUserProgress(testUser);
    await cacheSync.syncAllChallenges();
    
    console.log('✅ Cache synced!');

    // Show cached data
    console.log('\n📋 Cached Challenges:');
    const challenges = await cacheSync.getChallengesWithProgress(testUser);
    
    challenges.slice(0, 3).forEach(c => {
      console.log(`   ${c.id}. ${c.title}`);
      console.log(`      Progress: ${c.progress}/${c.target} (${c.completed ? 'COMPLETE ✅' : 'In Progress'})`);
    });

    cacheSync.close();

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE!');
  console.log('='.repeat(60));
}

testSteps()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });