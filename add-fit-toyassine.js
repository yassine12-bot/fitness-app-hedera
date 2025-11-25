require('dotenv').config();
const { Client, TransferTransaction, AccountId, PrivateKey, TokenId } = require('@hashgraph/sdk');

async function sendFIT() {
  // Use TREASURY account (not backend operator)
  const treasuryAccountId = '0.0.5459279';
  const treasuryPrivateKey = '3030020100300706052b8104000a04220420a9da8171c0aff87a369fcb0a90e5b5f1c9ff1f092f405af21a6eb54e9ce161db';
  
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(treasuryAccountId),
    PrivateKey.fromString(treasuryPrivateKey)
  );

  const fitTokenId = TokenId.fromString(process.env.FIT_TOKEN_ID);
  const toAccount = '0.0.7309024';  // Your account
  const amount = 500;  // Send 500 FIT

  console.log(`💸 Sending ${amount} FIT tokens...`);
  console.log(`   From Treasury: ${treasuryAccountId}`);
  console.log(`   To: ${toAccount}`);

  const tx = await new TransferTransaction()
    .addTokenTransfer(fitTokenId, treasuryAccountId, -amount)
    .addTokenTransfer(fitTokenId, toAccount, amount)
    .execute(client);

  const receipt = await tx.getReceipt(client);

  console.log(`✅ Transfer complete!`);
  console.log(`   Status: ${receipt.status.toString()}`);
  console.log(`   TX: https://hashscan.io/testnet/transaction/${tx.transactionId}`);

  client.close();
}

sendFIT().catch(console.error);