require('dotenv').config();
const marketplaceContract = require('../lib/marketplace-contract');
const db = require('../lib/db');

/**
 * ADD 8 PRODUCTS TO MARKETPLACE CONTRACT
 * Run after deploying new MarketplaceContract
 */

const products = [
  {
    name: "Running Shoes",
    description: "Professional running shoes with advanced cushioning",
    category: "equipment",
    priceTokens: 50,
    stock: 100,
    imageUrl: "https://example.com/images/running-shoes.jpg"
  },
  {
    name: "Protein Powder",
    description: "Whey protein 1kg - Chocolate flavor",
    category: "supplements",
    priceTokens: 30,
    stock: 50,
    imageUrl: "https://example.com/images/protein-powder.jpg"
  },
  {
    name: "Fitness Tracker",
    description: "Smart fitness watch with heart rate monitor",
    category: "equipment",
    priceTokens: 80,
    stock: 30,
    imageUrl: "https://example.com/images/fitness-tracker.jpg"
  },
  {
    name: "Yoga Mat",
    description: "Premium non-slip yoga mat with carrying strap",
    category: "equipment",
    priceTokens: 25,
    stock: 75,
    imageUrl: "https://example.com/images/yoga-mat.jpg"
  },
  {
    name: "Energy Bars",
    description: "Box of 12 high-protein energy bars",
    category: "supplements",
    priceTokens: 20,
    stock: 100,
    imageUrl: "https://example.com/images/energy-bars.jpg"
  },
  {
    name: "Resistance Bands",
    description: "Set of 5 resistance bands with handles",
    category: "equipment",
    priceTokens: 35,
    stock: 60,
    imageUrl: "https://example.com/images/resistance-bands.jpg"
  },
  {
    name: "Water Bottle",
    description: "Insulated stainless steel water bottle 1L",
    category: "equipment",
    priceTokens: 22,
    stock: 80,
    imageUrl: "https://example.com/images/water-bottle.jpg"
  },
  {
    name: "Multivitamins",
    description: "Complete multivitamin complex - 30-day supply",
    category: "supplements",
    priceTokens: 40,
    stock: 70,
    imageUrl: "https://example.com/images/multivitamins.jpg"
  }
];

async function addProducts() {
  console.log('📦 ADDING 8 PRODUCTS TO MARKETPLACE CONTRACT');
  console.log('=' .repeat(60));
  console.log('');
  
  try {
    // Initialize contract service
    await marketplaceContract.initialize();
    
    console.log('✅ Contract service initialized');
    console.log('');
    
    // Add each product
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`[${i + 1}/8] Adding: ${product.name}`);
      console.log(`   Price: ${product.priceTokens} FIT`);
      console.log(`   Category: ${product.category}`);
      console.log(`   Stock: ${product.stock}`);
      
      try {
        const result = await marketplaceContract.addProduct(product);
        console.log(`   ✅ Added! TX: ${result.transactionId}`);
        console.log(`   Explorer: https://hashscan.io/testnet/transaction/${result.transactionId}`);
        successCount++;
        
        // Also add to database cache
        await db.run(`
          INSERT OR REPLACE INTO products (id, name, description, category, priceTokens, stock, imageUrl)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [i + 1, product.name, product.description, product.category, product.priceTokens, product.stock, product.imageUrl]);
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        failCount++;
      }
      
      console.log('');
      
      // Wait 2 seconds between transactions to avoid rate limiting
      if (i < products.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('=' .repeat(60));
    console.log('✅ PROCESS COMPLETE');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Products added successfully: ${successCount}/8`);
    console.log(`   Failures: ${failCount}`);
    console.log('');
    
    // Verify in contract
    const count = await marketplaceContract.getProductCount();
    console.log(`🔍 Verification:`);
    console.log(`   Total products in contract: ${count}`);
    console.log('');
    
    if (count === 8) {
      console.log('🎉 All 8 products confirmed in contract!');
      
      // List all products
      console.log('');
      console.log('📋 Product List:');
      for (let i = 1; i <= 8; i++) {
        const p = await marketplaceContract.getProduct(i);
        console.log(`   ${i}. ${p.name} - ${p.priceTokens} FIT (${p.category})`);
      }
    }
    
    marketplaceContract.close();
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
addProducts();