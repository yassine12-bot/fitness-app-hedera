require('dotenv').config();
const {
  Client,
  AccountId,
  PrivateKey,
  TransferTransaction,
  TokenId
} = require('@hashgraph/sdk');

/**
 * Fund FitnessContract with FIT Tokens
 * 
 * Transfers tokens from treasury to contract for reward distribution
 */

async function fundContract() {
  console.log('💰 Funding FitnessContract\n');
  console.log('='.repeat(60));

  // Config
  const treasuryId = process.env.TREASURY_ACCOUNT_ID;
  const treasuryKey = process.env.TREASURY_PRIVATE_KEY;
  const contractId = process.env.FITNESS_CONTRACT_ADDRESS;
  const tokenId = process.env.FIT_TOKEN_ID;
  const amount = 5000; // 5000 FIT tokens

  if (!treasuryId || !treasuryKey || !contractId || !tokenId) {
    throw new Error('Missing required environment variables');
  }

  console.log('\n📋 Transfer Details:');
  console.log(`   From (Treasury): ${treasuryId}`);
  console.log(`   To (Contract): ${contractId}`);
  console.log(`   Token: ${tokenId}`);
  console.log(`   Amount: ${amount} FIT`);

  // Setup client
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(treasuryId),
    PrivateKey.fromString(treasuryKey)
  );

  try {
    console.log('\n💸 Transferring tokens...');

    // Transfer tokens
    const transaction = new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(treasuryId), -amount)
      .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(contractId), amount)
      .freezeWith(client);

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    console.log(`\n✅ Transfer successful!`);
    console.log(`   Status: ${receipt.status.toString()}`);
    console.log(`   Transaction ID: ${txResponse.transactionId.toString()}`);
    console.log(`   Explorer: https://hashscan.io/testnet/transaction/${txResponse.transactionId.toString()}`);

    console.log('\n💡 Contract is now funded and ready to distribute rewards!');

  } catch (error) {
    console.error('\n❌ Transfer failed:', error);
    throw error;
  } finally {
    client.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Done!');
}

fundContract()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });