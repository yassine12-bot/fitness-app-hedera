require('dotenv').config();
const { TransferTransaction, AccountId, PrivateKey, TokenId } = require('@hashgraph/sdk');
const hederaService = require('../lib/hedera');

async function approve() {
  await hederaService.initialize();
  
  const marketplaceAddress = process.env.MARKETPLACE_CONTRACT_ADDRESS; // 0.0.7303661
  const amount = 1000; // Approve 1000 FIT
  
  console.log(`Approving ${amount} FIT for marketplace...`);
  console.log(`Marketplace: ${marketplaceAddress}`);
  
  // Note: Hedera uses different approval mechanism than Ethereum
  // For now, just inform user
  console.log('\n⚠️  Hedera requires different approach:');
  console.log('1. User wallet must have FIT tokens');
  console.log('2. Contract must be treasury or approved spender');
  console.log('\nCheck if user has FIT balance first.');
}

approve();