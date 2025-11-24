// Patch for products.js - Line 32-51
// Replace the GET /products endpoint

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'api', 'marketplace', 'products.js');
let content = fs.readFileSync(filePath, 'utf8');

// The exact code to replace
const oldCode = `router.get('/products', authMiddleware, async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM products WHERE stock > 0';
    let params = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY category, priceTokens ASC';
    
    const products = await db.all(query, params);
    
    res.json({
      success: true,
      data: products
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des produits',
      error: error.message
    });
  }
});`;

// The new code
const newCode = `router.get('/products', authMiddleware, async (req, res) => {
  try {
    const { category } = req.query;
    
    // Query smart contract for products
    const productCount = await marketplaceContract.getProductCount();
    const products = [];
    
    for (let i = 1; i <= productCount; i++) {
      const product = await marketplaceContract.getProduct(i);
      
      // Filter: only active products with stock
      if (product.isActive && product.stock > 0) {
        // Apply category filter if specified
        if (!category || product.category === category) {
          products.push(product);
        }
      }
    }
    
    // Sort by category and price (same as before)
    products.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.priceTokens - b.priceTokens;
    });
    
    res.json({
      success: true,
      data: products
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des produits',
      error: error.message
    });
  }
});`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Products API updated to query smart contract!');
} else {
    console.log('❌ Could not find exact code to replace');
    console.log('File may have already been modified');
}
