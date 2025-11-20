const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');
const activityLogger = require('../../lib/activity-logger');
const crypto = require('crypto');

// Générer QR code unique
function generateQRCode() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * GET /api/marketplace/products
 * Récupérer tous les produits disponibles
 */
router.get('/products', authMiddleware, async (req, res) => {
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
});

/**
 * GET /api/marketplace/products/:id
 * Récupérer un produit spécifique
 */
router.get('/products/:id', authMiddleware, async (req, res) => {
  try {
    const product = await db.get(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du produit',
      error: error.message
    });
  }
});

/**
 * POST /api/marketplace/purchase
 * Acheter un produit avec des FIT tokens
 */
router.post('/purchase', authMiddleware, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId requis'
      });
    }
    
    // Récupérer le produit
    const product = await db.get(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }
    
    // Vérifier le stock
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Stock insuffisant'
      });
    }
    
    // Récupérer le solde de l'utilisateur
    const user = await db.get(
      'SELECT fitBalance FROM users WHERE id = ?',
      [req.user.id]
    );
    
    const totalCost = product.priceTokens * quantity;
    
    // Vérifier le solde
    if (user.fitBalance < totalCost) {
      return res.status(400).json({
        success: false,
        message: `Solde insuffisant. Tu as ${user.fitBalance} FIT, il faut ${totalCost} FIT`,
        data: {
          balance: user.fitBalance,
          required: totalCost,
          missing: totalCost - user.fitBalance
        }
      });
    }
    
    // Créer la table purchases si elle n'existe pas
    await db.run(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        totalCost INTEGER NOT NULL,
        qrCode TEXT UNIQUE NOT NULL,
        isUsed INTEGER DEFAULT 0,
        usedAt DATETIME,
        status TEXT DEFAULT 'completed',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    
    // Enregistrer l'achat
    
    // Générer QR code unique
    const qrCode = generateQRCode();
    const purchaseResult = await db.run(`
      INSERT INTO purchases (userId, productId, quantity, totalCost, qrCode)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, productId, quantity, totalCost, qrCode]);
    
    // Déduire les tokens
    await db.run(`
      UPDATE users SET fitBalance = fitBalance - ? WHERE id = ?
    `, [totalCost, req.user.id]);
    
    // Mettre à jour le stock
    await db.run(`
      UPDATE products SET stock = stock - ? WHERE id = ?
    `, [quantity, productId]);
    
    console.log(`🛒 Achat: ${product.name} x${quantity} par user ${req.user.id} - ${totalCost} FIT - QR: ${qrCode}`);
    
    // 📝 Logger l'événement d'achat dans le registry Hedera
    try {
      console.log('🔍 [DEBUG] Début du logging purchase dans Hedera...');
      
      // Récupérer le hederaAccountId
      const userInfo = await db.get('SELECT hederaAccountId FROM users WHERE id = ?', [req.user.id]);
      const userId = userInfo?.hederaAccountId || `user_${req.user.id}`;
      
      console.log(`🔍 [DEBUG] User ID pour logging: ${userId}`);
      
      // Initialiser le logger si pas déjà fait
      if (!activityLogger.initialized) {
        console.log('🔍 [DEBUG] Initialisation du activity logger...');
        await activityLogger.initialize();
      }
      
      console.log('🔍 [DEBUG] Appel de logPurchase...');
      const logResult = await activityLogger.logPurchase(
        userId,
        productId,
        product.name,
        totalCost,
        null // hederaTxId
      );
      
      if (logResult && logResult.success) {
        console.log(`✅ Événement "purchase" enregistré dans le registry Hedera (seq: ${logResult.sequenceNumber})`);
      } else {
        console.error('⚠️ Logging purchase échoué:', logResult?.error || 'Raison inconnue');
      }
    } catch (logError) {
      console.error('❌ ERREUR logging purchase registry:', logError.message);
      console.error('Stack:', logError.stack);
    }
    
    res.json({
      success: true,
      message: `Achat réussi! ${product.name} x${quantity} 🎉`,
      data: {
        purchaseId: purchaseResult.lastID,
        product: product.name,
        quantity,
        totalCost,
        remainingBalance: user.fitBalance - totalCost,
        qrCode: qrCode,
        isUsed: false
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur achat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'achat',
      error: error.message
    });
  }
});

/**
 * GET /api/marketplace/purchases
 * Historique des achats de l'utilisateur
 */
router.get('/purchases', authMiddleware, async (req, res) => {
  try {
    const purchases = await db.all(`
      SELECT 
        p.*,
        pr.name as productName,
        pr.category,
        pr.imageUrl
      FROM purchases p
      JOIN products pr ON p.productId = pr.id
      WHERE p.userId = ?
      ORDER BY p.createdAt DESC
      LIMIT 50
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: purchases
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des achats',
      error: error.message
    });
  }
});

/**
 * GET /api/marketplace/categories
 * Liste des catégories disponibles
 */
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const categories = await db.all(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM products
      WHERE stock > 0
      GROUP BY category
      ORDER BY category
    `);
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories',
      error: error.message
    });
  }
});

module.exports = router;
/**
 * POST /api/marketplace/verify-qr
 * Vérifier et utiliser un QR code
 */
router.post('/verify-qr', authMiddleware, async (req, res) => {
  try {
    const { qrCode } = req.body;
    
    if (!qrCode) {
      return res.status(400).json({
        success: false,
        message: 'qrCode requis'
      });
    }
    
    // Récupérer l'achat associé au QR code
    const purchase = await db.get(`
      SELECT 
        p.*,
        pr.name as productName,
        pr.category,
        u.name as userName
      FROM purchases p
      JOIN products pr ON p.productId = pr.id
      JOIN users u ON p.userId = u.id
      WHERE p.qrCode = ?
    `, [qrCode]);
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'QR code invalide'
      });
    }
    
    // Vérifier si déjà utilisé
    if (purchase.isUsed) {
      return res.status(400).json({
        success: false,
        message: 'QR code déjà utilisé',
        data: {
          usedAt: purchase.usedAt,
          productName: purchase.productName
        }
      });
    }
    
    // Marquer comme utilisé
    await db.run(`
      UPDATE purchases 
      SET isUsed = 1, usedAt = CURRENT_TIMESTAMP
      WHERE qrCode = ?
    `, [qrCode]);
    
    console.log(`✅ QR code utilisé: ${qrCode} - ${purchase.productName}`);
    
    res.json({
      success: true,
      message: 'QR code valide et marqué comme utilisé',
      data: {
        productName: purchase.productName,
        quantity: purchase.quantity,
        userName: purchase.userName,
        purchaseDate: purchase.createdAt
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du QR code',
      error: error.message
    });
  }
});