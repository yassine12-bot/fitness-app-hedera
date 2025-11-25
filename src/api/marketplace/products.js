const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');
const marketplaceContract = require('../../lib/marketplace-contract');
const cacheSync = require('../../lib/cache-sync');
const QRCode = require('qrcode'); // ✨ ADD THIS
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
   ContractId,
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
router.get('/products', async (req, res) => {
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
    
    // Sort by category and price
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
 * ✨ UPDATED: Real NFT ID extraction + QR code generation
 */
router.post('/purchase', authMiddleware, async (req, res) => {
  let userClient = null;
  
  try {
    // ✨ ADD THESE DEBUG LINES
    console.log('🔍 DEBUG req.user:', req.user);
    console.log('🔍 DEBUG req.user.id:', req.user?.id);
    console.log('🔍 DEBUG headers:', req.headers.authorization);
    
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
const contractIdForApproval = AccountId.fromString(process.env.MARKETPLACE_CONTRACT_ADDRESS);  // ✅ For approval
const contractIdForCall = ContractId.fromString(process.env.MARKETPLACE_CONTRACT_ADDRESS);     // ✅ For contract call
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
  .approveTokenAllowance(fitTokenId, user.hederaAccountId, contractIdForApproval, totalCost)  // ✅ Use AccountId
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
  .setContractId(contractIdForCall)  // ✅ Use ContractId
  .setGas(3000000)
  .setFunction("purchaseProduct", contractParams)
  .execute(userClient);
    
    const contractReceipt = await contractTx.getReceipt(userClient);
    
    console.log(`✅ Purchase complete! TX: ${contractTx.transactionId.toString()}`);
    console.log(`   Status: ${contractReceipt.status.toString()}`);
    
    const transactionId = contractTx.transactionId.toString();
    // ✨ ADD: Wait 2 seconds for blockchain state to update
await new Promise(resolve => setTimeout(resolve, 5000));
    // ====================================================
    // ✨ NEW: Extract REAL NFT ID from contract
    // ====================================================
    console.log('🔍 Querying contract for NFT ID...');
    const nftId = await marketplaceContract.getNFTCount();
    console.log(`✅ NFT ID extracted: ${nftId}`);
    
    // ====================================================
    // ✨ NEW: Generate QR code with full NFT data
    // ====================================================
    const purchaseDate = new Date().toISOString();
    const qrData = {
      nftId: nftId,
      productId: productId,
      productName: product.name,
      price: totalCost,
      purchaseDate: purchaseDate,
      buyer: user.hederaAccountId,
      transactionId: transactionId
    };
    
    // Generate QR code as Data URL
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
    
    console.log('✅ QR code generated with full data');
    
    // ====================================================
    // Sync cache (will also sync product stock)
    // ====================================================
    await cacheSync.onNFTPurchased(
      req.user.id,
      user.hederaAccountId,
      nftId,
      productId,
      totalCost,
      transactionId
    );
    
    // Close client
    if (userClient) {
      userClient.close();
    }
    
    // ====================================================
    // ✨ UPDATED Response with real NFT ID + QR code
    // ====================================================
    res.json({
      success: true,
      message: `Achat réussi! ${product.name} x${quantity} 🎉`,
      data: {
        purchaseId: nftId,
        nftId: nftId,  // ✅ Real blockchain NFT ID
        product: product.name,
        productId: productId,
        quantity: quantity,
        totalCost: totalCost,
        purchaseDate: purchaseDate,
        remainingBalance: user.fitBalance - totalCost,
        qrCode: qrCodeDataUrl,  // ✅ Full QR code image as data URL
        qrData: qrData,         // ✅ Raw data for verification
        isUsed: false,
        blockchain: {
          transactionId: transactionId,
          explorerUrl: `https://hashscan.io/testnet/transaction/${transactionId}`,
          nftContract: process.env.MARKETPLACE_CONTRACT_ADDRESS
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
   console.log('🔍 DEBUG /purchases - req.user:', req.user); // ✨ ADD THIS
  
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
 * ✨ UPDATED: Can verify both old mock NFTs and new real NFTs
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
    
    // Mark as used in cache
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