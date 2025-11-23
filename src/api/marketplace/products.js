const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');
const marketplaceContract = require('../../lib/marketplace-contract');
const cacheSync = require('../../lib/cache-sync');
const { 
  TransferTransaction, 
  TokenId, 
  AccountId, 
  PrivateKey, 
  Client,
  AccountAllowanceApproveTransaction,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  TransactionId,
  Timestamp
} = require('@hashgraph/sdk'); 
const { decryptPrivateKey } = require('../../lib/wallet-encryption');

/**
 * MARKETPLACE API - FULLY DECENTRALIZED
 * 
 * User approves + calls contract directly
 * Contract handles FIT transfer + NFT minting
 * Unique transaction IDs prevent duplicates
 */

/**
 * GET /api/marketplace/products
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
 * FULLY DECENTRALIZED with unique transaction IDs
 */
router.post('/purchase', authMiddleware, async (req, res) => {
  let userClient = null;
  
  try {
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId requis'
      });
    }
    
    // ====================================================
    // Get product from cache
    // ====================================================
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
    
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Stock insuffisant'
      });
    }
    
    // ====================================================
    // Get user and check balance
    // ====================================================
    const user = await db.get(
      'SELECT id, fitBalance, hederaAccountId, hederaPrivateKeyEncrypted FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (!user.hederaAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Aucun wallet Hedera associé. Créez un wallet d\'abord.'
      });
    }
    
    if (!user.hederaPrivateKeyEncrypted) {
      return res.status(400).json({
        success: false,
        message: 'Clé privée manquante. Veuillez recréer votre wallet.'
      });
    }
    
    const totalCost = product.priceTokens * quantity;
    
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
    
    // ====================================================
    // Setup user client (custodial signing)
    // ====================================================
    console.log(`🔐 Decrypting user key for ${user.hederaAccountId}...`);
    const userKey = decryptPrivateKey(user.hederaPrivateKeyEncrypted);
    
    userClient = Client.forTestnet();
    userClient.setOperator(
      AccountId.fromString(user.hederaAccountId), 
      PrivateKey.fromString(userKey)
    );
    
    // ====================================================
    // Approve contract to spend FIT tokens
    // ====================================================
    const fitTokenId = TokenId.fromString(process.env.FIT_TOKEN_ID);
    const contractId = AccountId.fromString(process.env.MARKETPLACE_CONTRACT_ADDRESS);
    
    console.log(`🔓 Approving contract to spend ${totalCost} FIT...`);
    
    // Generate unique transaction ID for approval
    const approveNow = Date.now();
    const approveValidStart = Timestamp.fromDate(new Date(approveNow));
    const approveTxId = TransactionId.withValidStart(
      AccountId.fromString(user.hederaAccountId),
      approveValidStart
    );
    
    const approveTx = await new AccountAllowanceApproveTransaction()
      .setTransactionId(approveTxId)
      .approveTokenAllowance(fitTokenId, user.hederaAccountId, contractId, totalCost)
      .execute(userClient);
    
    await approveTx.getReceipt(userClient);
    console.log(`✅ Approval granted`);
    
    // ====================================================
    // Call contract DIRECTLY from user's client
    // ====================================================
    console.log(`🛒 Calling contract.purchaseProduct(${productId}, ${quantity})...`);
    
    const contractParams = new ContractFunctionParameters()
      .addUint256(productId)
      .addUint256(quantity);
    
    // Generate unique transaction ID for contract call
    const contractNow = Date.now();
    const contractValidStart = Timestamp.fromDate(new Date(contractNow));
    const contractTxId = TransactionId.withValidStart(
      AccountId.fromString(user.hederaAccountId),
      contractValidStart
    );
    
    const contractTx = await new ContractExecuteTransaction()
      .setTransactionId(contractTxId)
      .setContractId(contractId)
      .setGas(1000000)
      .setFunction("purchaseProduct", contractParams)
      .execute(userClient);
    
    const contractReceipt = await contractTx.getReceipt(userClient);
    
    console.log(`✅ Purchase complete! TX: ${contractTx.transactionId.toString()}`);
    console.log(`   Status: ${contractReceipt.status.toString()}`);
    
    const contractResult = {
      success: true,
      transactionId: contractTx.transactionId.toString()
    };
    
    // ====================================================
    // Get NFT ID from contract events (temporary mock)
    // TODO: Parse contract logs to get real NFT ID
    // ====================================================
    const nftId = Date.now();
    
    // ====================================================
    // Sync cache
    // ====================================================
    await cacheSync.onNFTPurchased(
      req.user.id,
      user.hederaAccountId,
      nftId,
      productId,
      totalCost,
      contractResult.transactionId
    );
    
    // Close client
    if (userClient) {
      userClient.close();
    }
    
    // ====================================================
    // Response
    // ====================================================
    res.json({
      success: true,
      message: `Achat réussi! ${product.name} x${quantity} 🎉 (NFT minted on-chain)`,
      data: {
        purchaseId: nftId,
        product: product.name,
        quantity,
        totalCost,
        remainingBalance: user.fitBalance - totalCost,
        qrCode: `NFT-${nftId}`,
        nftId: nftId,
        isUsed: false,
        blockchain: {
          transactionId: contractResult.transactionId,
          explorerUrl: `https://hashscan.io/testnet/transaction/${contractResult.transactionId}`
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur achat:', error);
    
    // Clean up client
    if (userClient) {
      try {
        userClient.close();
      } catch (closeErr) {
        // Ignore close errors
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'achat',
      error: error.message
    });
  }
});

/**
 * GET /api/marketplace/purchases
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

/**
 * POST /api/marketplace/verify-qr
 * SIMPLIFIED: Cache-only verification (NFT IDs are mocked)
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
    
    // Get purchase from cache
    const purchase = await db.get(`
      SELECT p.*, pr.name as productName, u.name as userName
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
    
    // Check if already used
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
    
    // Mark as used in cache (skip contract for now - NFT IDs are mocked)
    await db.run(`
      UPDATE purchases
      SET isUsed = 1, usedAt = CURRENT_TIMESTAMP
      WHERE qrCode = ?
    `, [qrCode]);
    
    console.log(`✅ QR code ${qrCode} marked as used`);
    
    res.json({
      success: true,
      message: 'QR code valide et marqué comme utilisé ✅',
      data: {
        productName: purchase.productName,
        quantity: purchase.quantity,
        userName: purchase.userName,
        purchaseDate: purchase.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ Error verifying QR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du QR code',
      error: error.message
    });
  }
});

module.exports = router;