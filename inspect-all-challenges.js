require('dotenv').config();
const {
  Client,
  ContractCallQuery,
  ContractFunctionParameters,
  AccountId,
  PrivateKey
} = require('@hashgraph/sdk');

/**
 * Detailed inspection of ALL challenges in the contract
 */

async function inspectAllChallenges() {
  console.log('🔍 Detailed Challenge Inspection\n');
  console.log('='.repeat(60));

  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const contractId = '0.0.7316106';  // LATEST contract with fixed struct!
  
  console.log(`\n🎯 Checking LATEST contract with fixed struct: ${contractId}\n`);

  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(accountId),
    PrivateKey.fromString(privateKey)
  );

  try {
    // Get challenge count
    const countQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("challengeCount");
    const countResult = await countQuery.execute(client);
    const count = countResult.getUint256(0).toNumber();
    
    console.log(`\n📊 Total challenges: ${count}\n`);

    // Check ALL 15 challenges
    for (let i = 1; i <= Math.min(count, 15); i++) {
      const params = new ContractFunctionParameters().addUint256(i);
      const query = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(150000)
        .setFunction("getChallenge", params);

      const result = await query.execute(client);
      
      // ✅ FIXED: Parse Challenge struct with NEW order (uint256 first, strings last)
      const id = result.getUint256(0).toNumber();
      const target = result.getUint256(1).toNumber();    // ← Was at index 3, now at 1!
      const reward = result.getUint256(2).toNumber();    // ← Was at index 4, now at 2!
      const level = result.getUint256(3).toNumber();     // ← Was at index 5, now at 3!
      const isActive = result.getBool(4);                // ← Was at index 6, now at 4!
      const title = result.getString(5);                 // ← Was at index 1, now at 5!
      const type = result.getString(6);                  // ← Was at index 2, now at 6!
      
      console.log(`Challenge ${i}:`);
      console.log(`   ID: ${id}`);
      console.log(`   Target: ${target}`);
      console.log(`   Reward: ${reward}`);
      console.log(`   Level: ${level}`);
      console.log(`   Active: ${isActive}`);
      console.log(`   Title: "${title}"`);
      console.log(`   Type: "${type}"`);
      
      // Check if data is correct
      if (i === 1) {
        if (target === 1000 && reward === 5) {
          console.log(`   ✅ CORRECT DATA!`);
        } else {
          console.log(`   ❌ WRONG! Expected target=1000, reward=5`);
        }
      }
      
      console.log('');
    }

    // Analysis
    console.log('='.repeat(60));
    console.log('📋 ANALYSIS:\n');
    
    // Check for patterns
    const allTargets = [];
    const allRewards = [];
    
    for (let i = 1; i <= Math.min(count, 15); i++) {
      const params = new ContractFunctionParameters().addUint256(i);
      const query = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getChallenge", params);
      const result = await query.execute(client);
      allTargets.push(result.getUint256(1).toNumber());  // ← Fixed: index 1, not 3!
      allRewards.push(result.getUint256(2).toNumber());  // ← Fixed: index 2, not 4!
    }
    
    console.log('All targets:', allTargets.join(', '));
    console.log('All rewards:', allRewards.join(', '));
    
    // Check if all targets are 288
    if (allTargets.every(t => t === 288)) {
      console.log('\n🚨 ALL targets are 288! This is definitely a bug!');
      console.log('   Likely causes:');
      console.log('   1. String encoding issue corrupting uint256 values');
      console.log('   2. ABI encoding bug in Hardhat/ethers');
      console.log('   3. Storage layout issue in contract');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    client.close();
  }
}

inspectAllChallenges()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });