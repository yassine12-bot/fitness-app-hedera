require('dotenv').config();
const { Client, TokenMintTransaction, TokenId, PrivateKey, AccountId } = require('@hashgraph/sdk');

async function mintFIT() {
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
    PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
  );

  const fitTokenId = TokenId.fromString(process.env.FIT_TOKEN_ID);
  const amount = 10000;  // Mint 10,000 FIT

  console.log(`🪙 Minting ${amount} FIT tokens...`);

  const tx = await new TokenMintTransaction()
    .setTokenId(fitTokenId)
    .setAmount(amount)
    .execute(client);

  await tx.getReceipt(client);

  console.log(`✅ Minted ${amount} FIT!`);
  client.close();
}

mintFIT().catch(console.error);