require('dotenv').config();
const marketplaceContract = require('../src/lib/marketplace-contract');
const {
  Client,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  AccountId,
  PrivateKey
} = require('@hashgraph/sdk');

/**
 * UPDATE PRICES SCRIPT
 * Updates the 8 existing products to correct prices (20-100 FIT range)
 */

const CORRECT_PRICES = {
  1: 50,  // Running Shoes
  2: 30,  // Protein Powder
  3: 80,  // Fitness Tracker
  4: 25,  // Yoga Mat
  5: 20,  // Energy Bars
  6: 35,  // Resistance Bands
  7: 22,  // Water Bottle
  8: 40   // Multivitamins
};

async function updatePrices() {
  console.log('🔧 UPDATING PRODUCT PRICES');
  console.log('=' .repeat(60));
  
  try {
    // Initialize contract service
    await marketplaceContract.initialize();
    
    // Setup admin client
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    const contractId = process.env.MARKETPLACE_CONTRACT_ADDRESS;
    
    const client = Client.forTestnet();
    client.setOperator(AccountId.fromString(accountId), PrivateKey.fromString(privateKey));
    
    console.log(`📋 Contract: ${contractId}`);
    console.log('');
    
    // Update each product's price
    for (const [productId, newPrice] of Object.entries(CORRECT_PRICES)) {
      try {
        console.log(`⏳ Updating Product ${productId}...`);
        
        // Get current product info
        const product = await marketplaceContract.getProduct(parseInt(productId));
        console.log(`   Current: ${product.name} - ${product.priceTokens} FIT`);
        console.log(`   New:     ${product.name} - ${newPrice} FIT`);
        
        // Call updatePrice on contract
        const params = new ContractFunctionParameters()
          .addUint256(parseInt(productId))
          .addUint256(newPrice);
        
        const transaction = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(200000)
          .setFunction("updatePrice", params);
        
        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        
        console.log(`   ✅ Updated! TX: ${txResponse.transactionId.toString()}`);
        console.log('');
        
      } catch (error) {
        console.error(`   ❌ Error updating product ${productId}:`, error.message);
        console.log('');
      }
    }
    
    console.log('=' .repeat(60));
    console.log('✅ PRICE UPDATE COMPLETE');
    console.log('');
    console.log('📊 Summary:');
    console.log('   Products updated: 8');
    console.log('   Price range: 20-100 FIT');
    console.log('');
    
    // Verify updates
    console.log('🔍 Verifying updated prices:');
    for (let i = 1; i <= 8; i++) {
      const product = await marketplaceContract.getProduct(i);
      console.log(`   ${i}. ${product.name}: ${product.priceTokens} FIT`);
    }
    
    client.close();
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
updatePrices();