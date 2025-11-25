require('dotenv').config();
const {
  Client,
  ContractCallQuery,
  ContractFunctionParameters,
  AccountId,
  PrivateKey,
  AccountBalanceQuery,
  TokenId
} = require('@hashgraph/sdk');

/**
 * Diagnose why contract is reverting
 */

function hederaAccountIdToEvmAddress(accountId) {
  const parts = accountId.split('.');
  const accountNum = parts[2];
  const hexNum = parseInt(accountNum).toString(16).padStart(8, '0');
  return '0x' + '0'.repeat(32) + hexNum;
}

async function diagnose() {
  console.log('🔍 Diagnosing Contract Revert Issue\n');
  console.log('='.repeat(60));

  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  const contractId = '0.0.7316345';  // NEW contract
  const fitTokenId = process.env.FIT_TOKEN_ID;

  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(accountId),
    PrivateKey.fromString(privateKey)
  );

  console.log('\n📋 Configuration:');
  console.log(`   Contract: ${contractId}`);
  console.log(`   FIT Token: ${fitTokenId}`);
  console.log(`   Test User: ${accountId}`);

  try {
    // Check 1: Contract balance
    console.log('\n📊 Check 1: Contract Token Balance');
    const contractBalance = await new AccountBalanceQuery()
      .setAccountId(AccountId.fromString(contractId))
      .execute(client);
    
    console.log(`   HBAR: ${contractBalance.hbars.toString()}`);
    
    const fitBalance = contractBalance.tokens.get(TokenId.fromString(fitTokenId));
    if (fitBalance) {
      console.log(`   FIT Tokens: ${fitBalance.toString()} ✅`);
    } else {
      console.log(`   FIT Tokens: NOT ASSOCIATED ❌`);
      console.log('\n   🚨 PROBLEM FOUND: Contract is NOT associated with FIT token!');
      console.log('   This is why transfers fail and contract reverts.');
    }

    // Check 2: Query contract directly
    console.log('\n📊 Check 2: Contract State');
    
    const countQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("challengeCount");
    const countResult = await countQuery.execute(client);
    console.log(`   Challenge count: ${countResult.getUint256(0).toNumber()}`);

    // Check 3: Try to get contract balance (from contract's view)
    console.log('\n📊 Check 3: Contract\'s View of Its Balance');
    try {
      const balanceQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getContractBalance");
      const balanceResult = await balanceQuery.execute(client);
      console.log(`   Contract thinks it has: ${balanceResult.getUint256(0).toNumber()} FIT tokens`);
    } catch (error) {
      console.log(`   ❌ Cannot query contract balance: ${error.message}`);
    }

    // Check 4: User's current progress
    console.log('\n📊 Check 4: User Progress');
    const evmAddress = hederaAccountIdToEvmAddress(accountId);
    
    const stepsParams = new ContractFunctionParameters().addAddress(evmAddress);
    const stepsQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getTotalSteps", stepsParams);
    const stepsResult = await stepsQuery.execute(client);
    const totalSteps = stepsResult.getUint256(0).toNumber();
    console.log(`   Total steps: ${totalSteps}`);

    const progressParams = new ContractFunctionParameters()
      .addAddress(evmAddress)
      .addUint256(1);
    const progressQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getChallengeProgress", progressParams);
    const progressResult = await progressQuery.execute(client);
    const progress = progressResult.getUint256(0).toNumber();
    console.log(`   Challenge 1 progress: ${progress}`);

    // Check 5: Challenge 1 details
    console.log('\n📊 Check 5: Challenge 1 Details');
    const ch1Params = new ContractFunctionParameters().addUint256(1);
    const ch1Query = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getChallenge", ch1Params);
    const ch1Result = await ch1Query.execute(client);
    console.log(`   Target: ${ch1Result.getUint256(3).toNumber()}`);
    console.log(`   Reward: ${ch1Result.getUint256(4).toNumber()}`);
    console.log(`   Active: ${ch1Result.getBool(6)}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(60));

    if (!fitBalance) {
      console.log('\n🚨 ROOT CAUSE: Token Association Missing');
      console.log('\nThe contract is NOT associated with the FIT token.');
      console.log('When the contract tries to transfer rewards, it fails.');
      console.log('This causes the entire transaction to revert.');
      console.log('\n💡 SOLUTION: Associate the contract with the FIT token.');
      console.log('   Unfortunately, your current contract does NOT have');
      console.log('   a function to associate tokens.');
      console.log('\n📌 OPTIONS:');
      console.log('   1. Redeploy contract with HederaTokenService support');
      console.log('   2. For now: Test without completing challenges');
      console.log('   3. Use a different contract design');
    } else {
      console.log('\n✅ Contract IS associated with FIT token');
      console.log('   Balance: ' + fitBalance.toString());
      console.log('\n   The revert might be due to another issue.');
      console.log('   Check contract logs for more details.');
    }

  } catch (error) {
    console.error('\n❌ Diagnostic error:', error.message);
  } finally {
    client.close();
  }
}

diagnose()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });