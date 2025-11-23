require('dotenv').config();
const {
  Client,
  AccountId,
  PrivateKey,
  TransferTransaction,
  TokenId,
  Hbar
} = require('@hashgraph/sdk');

/**
 * Transfer FIT tokens to FitnessContract
 * Usage: node src/scripts/transfer-fit.js [amount]
 * Example: node src/scripts/transfer-fit.js 10000
 */

async function main() {
  console.log('💸 Transferring FIT Tokens to FitnessContract...\n');

  // Get amount from command line or use default
  const amount = process.argv[2] ? parseInt(process.argv[2]) : 10000;

  // Setup
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
  const fitTokenId = TokenId.fromString(process.env.FIT_TOKEN_ID);
  const contractAddress = process.env.FITNESS_CONTRACT_ADDRESS;

  if (!contractAddress) {
    throw new Error('FITNESS_CONTRACT_ADDRESS not found in .env');
  }

  console.log('📍 From:', accountId.toString());
  console.log('📍 To (Contract):', contractAddress);
  console.log('🪙 Token:', fitTokenId.toString());
  console.log('💰 Amount:', amount, 'FIT');
  console.log('');

  // Create client
  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);

  try {
    // Create transfer transaction
    console.log('⏳ Sending transaction...');
    
    const transaction = new TransferTransaction()
      .addTokenTransfer(fitTokenId, accountId, -amount)
      .addTokenTransfer(fitTokenId, contractAddress, amount)
      .setMaxTransactionFee(new Hbar(2));

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    console.log('✅ Transfer successful!');
    console.log('');
    console.log('📋 Transaction Details:');
    console.log('   Status:', receipt.status.toString());
    console.log('   TX ID:', txResponse.transactionId.toString());
    console.log('   Explorer:', `https://hashscan.io/testnet/transaction/${txResponse.transactionId.toString()}`);
    console.log('');
    console.log('✅ FitnessContract is now funded with', amount, 'FIT tokens!');
    console.log('');

  } catch (error) {
    console.error('❌ Transfer failed:', error.message);
    throw error;
  } finally {
    client.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });