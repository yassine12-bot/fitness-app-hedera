require('dotenv').config();
const { Client, AccountId, PrivateKey, TransferTransaction, TokenId } = require('@hashgraph/sdk');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  try {
    // Setup client
    const client = Client.forTestnet();
    const treasuryId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const treasuryKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
    const fitTokenId = TokenId.fromString(process.env.FIT_TOKEN_ID);
    
    client.setOperator(treasuryId, treasuryKey);

    // Get user account
    const userAccount = await question('Enter user Hedera Account ID (0.0.xxxxx): ');
    const amount = parseInt(await question('Enter FIT amount: '));
    
    console.log(`\n💸 Transferring ${amount} FIT to ${userAccount}...`);
    
    // Transfer
    const transferTx = await new TransferTransaction()
      .addTokenTransfer(fitTokenId, treasuryId, -amount)
      .addTokenTransfer(fitTokenId, userAccount, amount)
      .execute(client);
    
    await transferTx.getReceipt(client);
    
    console.log(`✅ Transfer complete!`);
    console.log(`   TX: ${transferTx.transactionId.toString()}`);
    
    client.close();
    rl.close();
    
  } catch (error) {
    console.error('❌ Transfer failed:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();