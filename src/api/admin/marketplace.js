const express = require('express');
const router = express.Router();
const authMiddleware = require('../../auth/middleware');
const adminMiddleware = require('../../auth/admin-middleware');
const marketplaceContract = require('../../lib/marketplace-contract');
const db = require('../../lib/db');

/**
 * ADMIN MARKETPLACE MANAGEMENT
 * Endpoints for managing products without redeploying contract
 */

/**
 * POST /api/admin/marketplace/products
 * Add a new product to the marketplace
 */
router.post('/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, category, priceTokens, stock, imageUrl } = req.body;
    
    // Validation
    if (!name || !priceTokens) {
      return res.status(400).json({
        success: false,
        message: 'Name and priceTokens are required'
      });
    }
    
    if (priceTokens < 20 || priceTokens > 100) {
      return res.status(400).json({
        success: false,
        message: 'Price must be between 20 and 100 FIT'
      });
    }
    
    console.log(`📦 Admin adding product: ${name} - ${priceTokens} FIT`);
    
    // Add to blockchain contract
    const result = await marketplaceContract.addProduct({
      name,
      description: description || '',
      category: category || 'general',
      priceTokens,
      stock: stock || 0,
      imageUrl: imageUrl || ''
    });
    
    if (!result.success) {
      throw new Error('Contract call failed');
    }
    
    // Get the new product count to know the product ID
    const productCount = await marketplaceContract.getProductCount();
    
    // Sync to database cache
    await db.run(`
      INSERT INTO products (id, name, description, category, priceTokens, stock, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [productCount, name, description || '', category || 'general', priceTokens, stock || 0, imageUrl || '']);
    
    console.log(`✅ Product added successfully: ID ${productCount}`);
    
    res.json({
      success: true,
      message: `Product "${name}" added successfully`,
      data: {
        productId: productCount,
        name,
        priceTokens,
        transactionId: result.transactionId,
        explorerUrl: `https://hashscan.io/testnet/transaction/${result.transactionId}`
      }
    });
    
  } catch (error) {
    console.error('❌ Error adding product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add product',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/marketplace/products/:id/price
 * Update product price
 */
router.put('/products/:id/price', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { newPrice } = req.body;
    
    // Validation
    if (!newPrice || newPrice < 20 || newPrice > 100) {
      return res.status(400).json({
        success: false,
        message: 'New price must be between 20 and 100 FIT'
      });
    }
    
    // Get current product info
    const product = await marketplaceContract.getProduct(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log(`💰 Admin updating price: ${product.name} from ${product.priceTokens} to ${newPrice} FIT`);
    
    // Update on blockchain
    const result = await marketplaceContract.updatePrice(productId, newPrice);
    
    if (!result.success) {
      throw new Error('Contract call failed');
    }
    
    // Update database cache
    await db.run('UPDATE products SET priceTokens = ? WHERE id = ?', [newPrice, productId]);
    
    console.log(`✅ Price updated successfully`);
    
    res.json({
      success: true,
      message: `Price for "${product.name}" updated from ${product.priceTokens} to ${newPrice} FIT`,
      data: {
        productId,
        productName: product.name,
        oldPrice: product.priceTokens,
        newPrice,
        transactionId: result.transactionId,
        explorerUrl: `https://hashscan.io/testnet/transaction/${result.transactionId}`
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating price:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update price',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/marketplace/products/:id/stock
 * Update product stock
 */
router.put('/products/:id/stock', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { newStock } = req.body;
    
    if (newStock === undefined || newStock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be a positive number'
      });
    }
    
    // Get product
    const product = await marketplaceContract.getProduct(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log(`📦 Admin updating stock: ${product.name} to ${newStock} units`);
    
    // Update stock on blockchain (assuming contract has this function)
    // For now, just update cache
    await db.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, productId]);
    
    console.log(`✅ Stock updated successfully`);
    
    res.json({
      success: true,
      message: `Stock for "${product.name}" updated to ${newStock} units`,
      data: {
        productId,
        productName: product.name,
        oldStock: product.stock,
        newStock
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/marketplace/products
 * Get all products (including inactive)
 */
router.get('/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const productCount = await marketplaceContract.getProductCount();
    const products = [];
    
    for (let i = 1; i <= productCount; i++) {
      const product = await marketplaceContract.getProduct(i);
      products.push(product);
    }
    
    res.json({
      success: true,
      data: products,
      count: products.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/marketplace/stats
 * Get marketplace statistics
 */
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const productCount = await marketplaceContract.getProductCount();
    const nftCount = await marketplaceContract.getNFTCount();
    
    // Get purchase stats from database
    const purchaseStats = await db.get(`
      SELECT 
        COUNT(*) as totalPurchases,
        SUM(totalCost) as totalRevenue
      FROM purchases
    `);
    
    const activeProducts = await db.all(`
      SELECT COUNT(*) as count FROM products WHERE stock > 0
    `);
    
    res.json({
      success: true,
      data: {
        totalProducts: productCount,
        activeProducts: activeProducts[0]?.count || 0,
        totalNFTsMinted: nftCount,
        totalPurchases: purchaseStats?.totalPurchases || 0,
        totalRevenue: purchaseStats?.totalRevenue || 0,
        averagePurchase: purchaseStats?.totalPurchases > 0 
          ? (purchaseStats.totalRevenue / purchaseStats.totalPurchases).toFixed(2)
          : 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

module.exports = router;