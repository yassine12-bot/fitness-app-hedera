// Simple script to update products.js
const fs = require('fs');

const filePath = './src/api/marketplace/products.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the products endpoint
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
    });`;

const newCode = `router.get('/products', authMiddleware, async (req, res) => {
  try {
    const { category } = req.query;
    
    // Query contract instead of database
    const productCount = await marketplaceContract.getProductCount();
    const products = [];
    
    for (let i = 1; i <= productCount; i++) {
      const product = await marketplaceContract.getProduct(i);
      if (product.isActive && product.stock > 0) {
        if (!category || product.category === category) {
          products.push(product);
        }
      }
    }
    
    res.json({
      success: true,
      data: products
    });`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Updated products API to query from contract!');
