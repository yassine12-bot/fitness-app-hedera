require('dotenv').config();
const fitnessContract = require('../lib/fitness-contract');

async function main() {
  await fitnessContract.initialize();
  
  const userAccountId = '0.0.7304262';
  const steps = await fitnessContract.getTotalSteps(userAccountId);
  const challenge1Progress = await fitnessContract.getChallengeProgress(userAccountId, 1);
  const challenge1Complete = await fitnessContract.isChallengeCompleted(userAccountId, 1);
  // Add to check-user-steps.js
const contractBalance = await fitnessContract.getContractBalance();
console.log('Contract FIT Balance:', contractBalance);
  console.log('User:', userAccountId);
  console.log('Total Steps (on-chain):', steps);
  console.log('Challenge #1 Progress:', challenge1Progress);
  console.log('Challenge #1 Completed:', challenge1Complete);
  for (let i = 2; i <= 5; i++) {
  const complete = await fitnessContract.isChallengeCompleted(userAccountId, i);
  console.log(`Challenge #${i} Completed:`, complete);
}
}

main().then(() => process.exit(0)).catch(console.error);