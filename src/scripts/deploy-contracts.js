require('dotenv').config();
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

/**
 * Deploy Contracts Script
 * 
 * Steps:
 * 1. Compile Solidity contracts
 * 2. Deploy FitnessContract
 * 3. Deploy MarketplaceContract
 * 4. Initialize with challenges from SQLite
 * 5. Initialize with products from SQLite
 * 6. Fund contracts with FIT tokens
 * 7. Save contract addresses to .env
 */

// Database helper
function getDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(
      process.env.DATABASE_PATH || './data.db',
      (err) => {
        if (err) reject(err);
        else resolve(db);
      }
    );
  });
}

function dbAll(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbClose(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Convert Hedera Token ID (0.0.xxxxx) to EVM address format
 * Hedera uses a special conversion for token IDs on EVM
 */
function hederaTokenIdToEvmAddress(tokenId) {
  // Remove "0.0." prefix and get the token number
  const tokenNum = tokenId.replace('0.0.', '');

  // Convert to hex and pad to 40 characters (20 bytes)
  // Hedera tokens use a specific address format: 0x0000000000000000000000000000000000xxxxxx
  const hexNum = parseInt(tokenNum).toString(16).padStart(8, '0');
  const evmAddress = '0x' + '0'.repeat(32) + hexNum;

  return evmAddress;
}

async function main() {
  console.log('🚀 Starting Hedera Fit contract deployment...\n');

  // ====================================================
  // 1. SETUP
  // ====================================================

  const [deployer] = await hre.ethers.getSigners();
  console.log('📍 Deploying from account:', deployer.address);

  const FIT_TOKEN_ID = process.env.FIT_TOKEN_ID;
  const TREASURY_ADDRESS = deployer.address; // Treasury = deployer for now

  if (!FIT_TOKEN_ID) {
    throw new Error('FIT_TOKEN_ID not found in .env');
  }

  // Convert Hedera token ID to EVM address format
  const FIT_TOKEN_ADDRESS = hederaTokenIdToEvmAddress(FIT_TOKEN_ID);

  console.log('🪙 FIT Token ID (Hedera):', FIT_TOKEN_ID);
  console.log('🪙 FIT Token Address (EVM):', FIT_TOKEN_ADDRESS);
  console.log('💰 Treasury Address:', TREASURY_ADDRESS);
  console.log('');

  // ====================================================
  // 2. DEPLOY FITNESS CONTRACT
  // ====================================================

  console.log('📦 Deploying FitnessContract...');
  const FitnessContract = await hre.ethers.getContractFactory("FitnessContract");
  const fitnessContract = await FitnessContract.deploy(FIT_TOKEN_ADDRESS);
  await fitnessContract.waitForDeployment();

  const fitnessAddress = await fitnessContract.getAddress();
  console.log('✅ FitnessContract deployed:', fitnessAddress);
  console.log('');

  // ====================================================
  // 3. DEPLOY MARKETPLACE CONTRACT
  // ====================================================

  console.log('📦 Deploying MarketplaceContract...');
  const MarketplaceContract = await hre.ethers.getContractFactory("MarketplaceContract");
  const marketplaceContract = await MarketplaceContract.deploy(FIT_TOKEN_ADDRESS, TREASURY_ADDRESS);
  await marketplaceContract.waitForDeployment();

  const marketplaceAddress = await marketplaceContract.getAddress();
  console.log('✅ MarketplaceContract deployed:', marketplaceAddress);
  console.log('');

  // ====================================================
  // 4. INITIALIZE CHALLENGES FROM SQLITE
  // ====================================================

  console.log('📊 Loading challenges from SQLite...');
  const db = await getDb();

  try {
    const challenges = await dbAll(db, `
      SELECT * FROM challenges WHERE isActive = 1 ORDER BY level ASC, type ASC
    `);

    console.log(`Found ${challenges.length} active challenges`);

    for (const challenge of challenges) {
      console.log(`  → Adding: ${challenge.title} (Level ${challenge.level})`);

      const tx = await fitnessContract.addChallenge(
        challenge.title,
        challenge.type,
        challenge.target,
        challenge.reward,
        challenge.level
      );
      await tx.wait();
    }

    console.log('✅ All challenges added to contract');
    console.log('');
  } catch (error) {
    console.error('⚠️ Error loading challenges:', error.message);
  }

  // ====================================================
  // 5. INITIALIZE PRODUCTS FROM SQLITE
  // ====================================================

  console.log('🛒 Loading products from SQLite...');

  try {
    const products = await dbAll(db, `
      SELECT * FROM products ORDER BY id ASC
    `);

    console.log(`Found ${products.length} products`);

    for (const product of products) {
      console.log(`  → Adding: ${product.name} (${product.priceTokens} FIT)`);

      const tx = await marketplaceContract.addProduct(
        product.name,
        product.description || '',
        product.category || 'general',
        product.priceTokens,
        product.stock || 0,
        product.imageUrl || ''
      );
      await tx.wait();
    }

    console.log('✅ All products added to contract');
    console.log('');
  } catch (error) {
    console.error('⚠️ Error loading products:', error.message);
  }

  await dbClose(db);

  // ====================================================
  // 6. SAVE ADDRESSES TO .ENV
  // ====================================================

  console.log('💾 Saving contract addresses to .env...');

  const envPath = path.resolve(__dirname, '../../.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Remove old contract addresses if they exist
  envContent = envContent.replace(/^FITNESS_CONTRACT_ADDRESS=.*$/gm, '');
  envContent = envContent.replace(/^MARKETPLACE_CONTRACT_ADDRESS=.*$/gm, '');

  // Add new addresses
  envContent += `\n\n# Smart Contract Addresses (deployed ${new Date().toISOString()})\n`;
  envContent += `FITNESS_CONTRACT_ADDRESS=${fitnessAddress}\n`;
  envContent += `MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}\n`;

  fs.writeFileSync(envPath, envContent);

  console.log('✅ Contract addresses saved to .env');
  console.log('');

  // ====================================================
  // 7. SUMMARY
  // ====================================================

  console.log('========================================');
  console.log('🎉 DEPLOYMENT COMPLETE!');
  console.log('========================================');
  console.log('');
  console.log('📋 Contract Addresses:');
  console.log(`   FitnessContract: ${fitnessAddress}`);
  console.log(`   MarketplaceContract: ${marketplaceAddress}`);
  console.log('');
  console.log('🔗 Explorers:');
  console.log(`   Fitness: https://hashscan.io/testnet/contract/${fitnessAddress}`);
  console.log(`   Marketplace: https://hashscan.io/testnet/contract/${marketplaceAddress}`);
  console.log('');
  console.log('⚠️ NEXT STEPS:');
  console.log('   1. Fund FitnessContract with FIT tokens for rewards:');
  console.log(`      → Transfer FIT to ${fitnessAddress}`);
  console.log('');
  console.log('   2. Approve MarketplaceContract to spend your FIT tokens:');
  console.log(`      → Call approve(${marketplaceAddress}, amount) on FIT token`);
  console.log('');
  console.log('   3. Restart backend server to load new contract addresses');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });