// Create src/scripts/check-balance.js
require('dotenv').config();
const { Client, AccountId, PrivateKey, AccountBalanceQuery, TokenId } = require('@hashgraph/sdk');

async function main() {
  const client = Client.forTestnet();
  const treasuryId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const treasuryKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
  const fitTokenId = TokenId.fromString(process.env.FIT_TOKEN_ID);
  
  client.setOperator(treasuryId, treasuryKey);
  
  const balance = await new AccountBalanceQuery()
    .setAccountId(treasuryId)
    .execute(client);
  
  console.log(`💰 Treasury (${treasuryId}):`);
  console.log(`   HBAR: ${balance.hbars}`);
  console.log(`   FIT: ${balance.tokens.get(fitTokenId) || 0}`);
  
  client.close();
}

main();