const marketplaceContract = require('./src/lib/marketplace-contract');

async function addFreshProducts() {
    console.log('🛒 Adding fresh products to MarketplaceContract...\n');

    await marketplaceContract.initialize();

    const products = [
        {
            name: '🏃 Running Shoes Pro',
            description: 'Professional running shoes with advanced cushioning',
            category: 'equipment',
            priceTokens: 500,
            stock: 50,
            imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff'
        },
        {
            name: '💧 Smart Water Bottle',
            description: 'Insulated bottle with hydration tracking',
            category: 'equipment',
            priceTokens: 150,
            stock: 100,
            imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8'
        },
        {
            name: '👕 Performance T-Shirt',
            description: 'Breathable moisture-wicking athletic shirt',
            category: 'apparel',
            priceTokens: 200,
            stock: 75,
            imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab'
        },
        {
            name: '🎽 Compression Leggings',
            description: 'High-performance compression wear',
            category: 'apparel',
            priceTokens: 300,
            stock: 60,
            imageUrl: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8'
        },
        {
            name: '⌚ Fitness Tracker',
            description: 'Advanced fitness tracking smartwatch',
            category: 'equipment',
            priceTokens: 800,
            stock: 30,
            imageUrl: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6'
        },
        {
            name: '🧘 Yoga Mat Premium',
            description: 'Extra thick non-slip yoga mat',
            category: 'equipment',
            priceTokens: 250,
            stock: 80,
            imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f'
        },
        {
            name: '🥤 Protein Shake Mix',
            description: '1kg premium whey protein powder',
            category: 'nutrition',
            priceTokens: 350,
            stock: 120,
            imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d'
        },
        {
            name: '🎧 Wireless Earbuds',
            description: 'Sweat-proof sports earbuds',
            category: 'equipment',
            priceTokens: 400,
            stock: 45,
            imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df'
        }
    ];

    console.log(`Adding ${products.length} products to contract...\n`);

    for (const product of products) {
        try {
            console.log(`Adding: ${product.name}...`);
            const result = await marketplaceContract.addProduct(product);
            console.log(`✅ Added! TX: ${result.transactionId}\n`);
        } catch (error) {
            console.error(`❌ Error adding ${product.name}:`, error.message);
        }
    }

    // Verify
    console.log('\n📊 Verifying products...');
    const count = await marketplaceContract.getProductCount();
    console.log(`Total products in contract: ${count}`);

    for (let i = 1; i <= Math.min(count, 8); i++) {
        const product = await marketplaceContract.getProduct(i);
        console.log(`  ${i}. ${product.name} - ${product.priceTokens} FIT (Stock: ${product.stock})`);
    }

    console.log('\n✅ Done! Products ready for marketplace.');
    process.exit(0);
}

addFreshProducts().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
