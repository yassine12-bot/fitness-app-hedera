require('dotenv').config();
const {
  Client,
  ContractCallQuery,
  ContractFunctionParameters,
  AccountId,
  PrivateKey
} = require('@hashgraph/sdk');

/**
 * DIAGNOSE CONTRACT STATE
 * Checks if contract has challenges and if data is correct or corrupted
 */

async function diagnoseContract() {
  console.log('='.repeat(80));
  console.log('🔍 DIAGNOSING FITNESS CONTRACT STATE');
  console.log('='.repeat(80));
  console.log('');

  // Initialize Hedera client
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
    PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
  );

  const contractId = process.env.FITNESS_CONTRACT_ADDRESS;

  console.log(`📝 Contract Address: ${contractId}`);
  console.log(`🔗 Explorer: https://hashscan.io/testnet/contract/${contractId}`);
  console.log('');

  try {
    // ====================================================
    // STEP 1: Check Challenge Count
    // ====================================================
    console.log('📊 STEP 1: Checking Challenge Count...');
    console.log('-'.repeat(80));

    const countQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction('challengeCount');

    const countResult = await countQuery.execute(client);
    const challengeCount = countResult.getUint256(0).toNumber();

    console.log(`   Challenge Count: ${challengeCount}`);
    console.log('');

    if (challengeCount === 0) {
      console.log('❌ DIAGNOSIS: CONTRACT IS EMPTY!');
      console.log('');
      console.log('📋 What this means:');
      console.log('   - Contract was deployed successfully');
      console.log('   - But NO challenges were added to it');
      console.log('   - challengeCount = 0');
      console.log('');
      console.log('✅ SOLUTION:');
      console.log('   Run: node seed-contract-challenges.js');
      console.log('   This will call addChallenge() 15 times to populate the contract');
      console.log('');
      client.close();
      return;
    }

    // ====================================================
    // STEP 2: Query Each Challenge and Check Data
    // ====================================================
    console.log(`📊 STEP 2: Querying ${challengeCount} Challenges...`);
    console.log('-'.repeat(80));
    console.log('');

    // Expected values for the 15 challenges
    const expectedChallenges = [
      { id: 1, target: 1000, reward: 5, level: 1, name: 'Premier Pas' },
      { id: 2, target: 3000, reward: 10, level: 1, name: 'Début d\'Aventure' },
      { id: 3, target: 2, reward: 8, level: 1, name: 'Partage (social)' },
      { id: 4, target: 5000, reward: 15, level: 2, name: 'Randonneur' },
      { id: 5, target: 15000, reward: 30, level: 2, name: 'Marathonien Débutant' },
      { id: 6, target: 3, reward: 20, level: 2, name: 'Ambassadeur (social)' },
      { id: 7, target: 10000, reward: 30, level: 3, name: 'Marcheur Sérieux' },
      { id: 8, target: 50000, reward: 60, level: 3, name: 'Endurance Pro' },
      { id: 9, target: 5, reward: 35, level: 3, name: 'Influenceur (social)' },
      { id: 10, target: 15000, reward: 50, level: 4, name: 'Champion du Jour' },
      { id: 11, target: 100000, reward: 100, level: 4, name: 'Ultra-Marathonien' },
      { id: 12, target: 7, reward: 50, level: 4, name: 'Leader (social)' },
      { id: 13, target: 20000, reward: 80, level: 5, name: 'Maître du Mouvement' },
      { id: 14, target: 200000, reward: 200, level: 5, name: 'Légende Vivante' },
      { id: 15, target: 10, reward: 80, level: 5, name: 'Icône (social)' }
    ];

    let correctCount = 0;
    let corruptedCount = 0;
    const issues = [];

    for (let i = 1; i <= Math.min(challengeCount, 15); i++) {
      const params = new ContractFunctionParameters().addUint256(i);

      const query = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction('getChallenge', params);

      try {
        const result = await query.execute(client);

        const onChain = {
          target: result.getUint256(0).toNumber(),
          reward: result.getUint256(1).toNumber(),
          level: result.getUint256(2).toNumber(),
          active: result.getBool(3)
        };

        const expected = expectedChallenges[i - 1];

        const targetMatch = onChain.target === expected.target;
        const rewardMatch = onChain.reward === expected.reward;
        const levelMatch = onChain.level === expected.level;
        const isCorrect = targetMatch && rewardMatch && levelMatch && onChain.active;

        if (isCorrect) {
          correctCount++;
          console.log(`✅ Challenge ${i}: ${expected.name}`);
          console.log(`   Target: ${onChain.target.toLocaleString()} | Reward: ${onChain.reward} FIT | Level: ${onChain.level}`);
        } else {
          corruptedCount++;
          console.log(`❌ Challenge ${i}: ${expected.name} - CORRUPTED!`);
          console.log(`   ON-CHAIN: Target=${onChain.target}, Reward=${onChain.reward}, Level=${onChain.level}`);
          console.log(`   EXPECTED: Target=${expected.target}, Reward=${expected.reward}, Level=${expected.level}`);
          
          issues.push({
            id: i,
            name: expected.name,
            onChain,
            expected
          });
        }
        console.log('');

      } catch (error) {
        console.log(`❌ Challenge ${i}: Query failed - ${error.message}`);
        console.log('');
        corruptedCount++;
      }
    }

    // ====================================================
    // STEP 3: Diagnosis Summary
    // ====================================================
    console.log('='.repeat(80));
    console.log('📊 DIAGNOSIS SUMMARY');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total Challenges in Contract: ${challengeCount}`);
    console.log(`Correct Challenges: ${correctCount}`);
    console.log(`Corrupted/Wrong Challenges: ${corruptedCount}`);
    console.log('');

    if (corruptedCount === 0) {
      console.log('✅ ALL CHALLENGES ARE CORRECT!');
      console.log('');
      console.log('🎯 Your contract is ready to use!');
      console.log('   Run: node FINAL-TEST.js');
    } else {
      console.log('❌ DIAGNOSIS: DATA IS CORRUPTED OR WRONG!');
      console.log('');
      console.log('📋 Issues Found:');
      issues.forEach(issue => {
        console.log(`   Challenge ${issue.id}: ${issue.name}`);
        console.log(`      Expected: target=${issue.expected.target}, reward=${issue.expected.reward}`);
        console.log(`      Got: target=${issue.onChain.target}, reward=${issue.onChain.reward}`);
      });
      console.log('');
      console.log('🔧 POSSIBLE CAUSES:');
      console.log('   1. Deployed with OLD contract version (had strings)');
      console.log('   2. Seeded with wrong values');
      console.log('   3. Contract ABI mismatch');
      console.log('');
      console.log('✅ SOLUTIONS:');
      console.log('   Option A - Fresh Deploy (RECOMMENDED):');
      console.log('      1. Delete current contract');
      console.log('      2. Compile fresh: npx hardhat compile --force');
      console.log('      3. Deploy: node deploy-fitness-simple.js');
      console.log('');
      console.log('   Option B - Fix Current Contract:');
      console.log('      (Not possible - need to redeploy)');
    }

  } catch (error) {
    console.log('');
    console.log('❌ ERROR: ' + error.message);
    console.log('');
    console.log('🔍 Possible reasons:');
    console.log('   1. Contract address wrong in .env');
    console.log('   2. Contract not deployed yet');
    console.log('   3. Network connection issues');
  } finally {
    client.close();
  }

  console.log('='.repeat(80));
}

diagnoseContract().catch(console.error);