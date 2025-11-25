require('dotenv').config();
const {
  Client,
  ContractCallQuery,
  ContractFunctionParameters,
  AccountId,
  PrivateKey
} = require('@hashgraph/sdk');

/**
 * QUERY ACTUAL BLOCKCHAIN CHALLENGE DATA
 * Shows exactly what values are stored in the contract
 */

async function queryBlockchainChallenges() {
  console.log('='.repeat(80));
  console.log('🔍 QUERYING ACTUAL BLOCKCHAIN CHALLENGE DATA');
  console.log('='.repeat(80));
  console.log('');

  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
    PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
  );

  const contractId = process.env.FITNESS_CONTRACT_ADDRESS;

  console.log(`📝 Contract: ${contractId}`);
  console.log(`🔗 Explorer: https://hashscan.io/testnet/contract/${contractId}`);
  console.log('');

  try {
    // Get challenge count
    const countQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction('challengeCount');

    const countResult = await countQuery.execute(client);
    const challengeCount = countResult.getUint256(0).toNumber();

    console.log(`📊 Total Challenges: ${challengeCount}`);
    console.log('');
    console.log('='.repeat(80));
    console.log('ACTUAL ON-CHAIN DATA');
    console.log('='.repeat(80));
    console.log('');

    const challenges = [];

    for (let i = 1; i <= challengeCount; i++) {
      const params = new ContractFunctionParameters().addUint256(i);

      const query = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction('getChallenge', params);

      const result = await query.execute(client);

      const challenge = {
        id: i,
        target: result.getUint256(0).toNumber(),
        reward: result.getUint256(1).toNumber(),
        level: result.getUint256(2).toNumber(),
        active: result.getBool(3)
      };

      challenges.push(challenge);

      const levelEmoji = ['🌱', '🔵', '🟡', '🔴', '👑'][challenge.level - 1] || '❓';

      console.log(`${levelEmoji} Challenge ${i}:`);
      console.log(`   Target:  ${challenge.target.toLocaleString()}`);
      console.log(`   Reward:  ${challenge.reward} FIT`);
      console.log(`   Level:   ${challenge.level}`);
      console.log(`   Active:  ${challenge.active ? 'YES' : 'NO'}`);
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('📊 ANALYSIS');
    console.log('='.repeat(80));
    console.log('');

    // Group by level
    const byLevel = {};
    challenges.forEach(ch => {
      if (!byLevel[ch.level]) byLevel[ch.level] = [];
      byLevel[ch.level].push(ch);
    });

    console.log('📋 Challenges by Level:');
    for (let level = 1; level <= 5; level++) {
      const levelChallenges = byLevel[level] || [];
      const emoji = ['🌱', '🔵', '🟡', '🔴', '👑'][level - 1];
      console.log(`   ${emoji} Level ${level}: ${levelChallenges.length} challenges`);
      if (levelChallenges.length > 0) {
        levelChallenges.forEach(ch => {
          console.log(`      • ID ${ch.id}: Target=${ch.target.toLocaleString()}, Reward=${ch.reward} FIT`);
        });
      }
    }
    console.log('');

    // Detect patterns
    console.log('🔍 Pattern Detection:');
    console.log('');

    // Check if IDs 1-5 are level 1-5 (Daily pattern)
    const first5 = challenges.slice(0, 5);
    const isDaily15 = first5.every((ch, idx) => ch.level === idx + 1);
    
    if (isDaily15) {
      console.log('✅ IDs 1-5: Sequential levels (1→5) - Likely DAILY challenges');
      console.log('   Targets: ' + first5.map(ch => ch.target.toLocaleString()).join(' → '));
    }

    const second5 = challenges.slice(5, 10);
    const isDuration610 = second5.every((ch, idx) => ch.level === idx + 1);
    
    if (isDuration610) {
      console.log('✅ IDs 6-10: Sequential levels (1→5) - Likely DURATION challenges');
      console.log('   Targets: ' + second5.map(ch => ch.target.toLocaleString()).join(' → '));
    }

    const third5 = challenges.slice(10, 15);
    const isSocial1115 = third5.every((ch, idx) => ch.level === idx + 1);
    
    if (isSocial1115) {
      console.log('✅ IDs 11-15: Sequential levels (1→5) - Likely SOCIAL challenges');
      console.log('   Targets: ' + third5.map(ch => ch.target.toLocaleString()).join(' → '));
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📋 RAW DATA (Copy/Paste for Code)');
    console.log('='.repeat(80));
    console.log('');
    console.log('const BLOCKCHAIN_CHALLENGES = [');
    challenges.forEach(ch => {
      console.log(`  { id: ${ch.id}, target: ${ch.target}, reward: ${ch.reward}, level: ${ch.level} },`);
    });
    console.log('];');
    console.log('');

  } catch (error) {
    console.log('❌ ERROR: ' + error.message);
    console.log(error.stack);
  } finally {
    client.close();
  }

  console.log('='.repeat(80));
}

queryBlockchainChallenges().catch(console.error);