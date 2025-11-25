require('dotenv').config();
const marketplaceContract = require('../lib/marketplace-contract');
const db = require('../lib/db');

/**
 * SYNC PRODUCTS FROM CONTRACT TO DATABASE
 * Run on server startup to cache products
 */
async function syncProducts() {
  console.log('🔄 SYNCING PRODUCTS FROM CONTRACT TO DATABASE');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    await marketplaceContract.initialize();
    
    console.log('✅ Contract service initialized');
    console.log(`   Contract: ${process.env.MARKETPLACE_CONTRACT_ADDRESS}`);
    console.log('');
    
    const productCount = await marketplaceContract.getProductCount();
    console.log(`📊 Products in contract: ${productCount}`);
    console.log('');
    
    if (productCount === 0) {
      console.log('⚠️  No products found in contract');
      return;
    }
    
    let successCount = 0;
    
    for (let i = 1; i <= productCount; i++) {
      try {
        const product = await marketplaceContract.getProduct(i);
        
        await db.run(`
          INSERT OR REPLACE INTO products 
          (id, name, description, category, priceTokens, stock, imageUrl, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          product.id, 
          product.name, 
          product.description, 
          product.category, 
          product.priceTokens, 
          product.stock, 
          product.imageUrl
        ]);
        
        console.log(`   ✓ ${product.name} - ${product.priceTokens} FIT`);
        successCount++;
        
      } catch (error) {
        console.error(`   ✗ Error syncing product ${i}:`, error.message);
      }
    }
    
    console.log('');
    console.log(`✅ ${successCount}/${productCount} products synced`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

module.exports = syncProducts;