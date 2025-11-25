require('dotenv').config();
const {
  Client,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  AccountId,
  PrivateKey
} = require('@hashgraph/sdk');

/**
 * Convert Hedera Account ID to EVM address
 */
function hederaAccountIdToEvmAddress(accountId) {
  const parts = accountId.split('.');
  const accountNum = parts[2];
  const hexNum = parseInt(accountNum).toString(16).padStart(8, '0');
  return '0x' + '0'.repeat(32) + hexNum;
}

/**
 * Convert EVM address to Hedera ID
 */
function evmAddressToHederaId(evmAddress) {
  if (evmAddress.startsWith('0.0.')) return evmAddress;
  const hex = evmAddress.replace('0x', '').replace(/^0+/, '');
  const num = parseInt(hex, 16);
  return `0.0.${num}`;
}

class MarketplaceContractService {
  constructor() {
    this.client = null;
    this.contractId = null;
    this.operatorId = null;
    this.operatorKey = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔗 Initializing MarketplaceContract service...');

      const accountId = process.env.HEDERA_ACCOUNT_ID;
      const privateKey = process.env.HEDERA_PRIVATE_KEY;
      const contractAddress = process.env.MARKETPLACE_CONTRACT_ADDRESS;

      if (!accountId || !privateKey) {
        throw new Error('Hedera credentials missing in .env');
      }

      if (!contractAddress) {
        console.warn('⚠️ MARKETPLACE_CONTRACT_ADDRESS not found in .env');
        console.warn('   Run deploy-contracts.js first');
        return false;
      }

      this.operatorId = AccountId.fromString(accountId);
      this.operatorKey = PrivateKey.fromString(privateKey);
      
      // Check if already Hedera format or needs conversion from EVM
      if (contractAddress.startsWith('0.0.')) {
        this.contractId = contractAddress;
      } else {
        this.contractId = evmAddressToHederaId(contractAddress);
      }

      this.client = Client.forTestnet();
      this.client.setOperator(this.operatorId, this.operatorKey);

      this.initialized = true;
      console.log('✅ MarketplaceContract service initialized');
      console.log(`   Contract: ${this.contractId}`);

      return true;
    } catch (error) {
      console.error('❌ MarketplaceContract initialization failed:', error.message);
      return false;
    }
  }

  async purchaseProduct(userAddress, productId, quantity = 1) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MarketplaceContract service not initialized');
    }

    try {
      console.log(`🛒 Purchasing product ${productId} for ${userAddress}`);

      const params = new ContractFunctionParameters()
        .addUint256(productId)
        .addUint256(quantity);

      const transaction = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(1000000)
        .setFunction("purchaseProduct", params);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      console.log(`✅ Purchase complete! Status: ${receipt.status.toString()}`);
      console.log(`   Transaction ID: ${txResponse.transactionId.toString()}`);
      
      return {
        success: true,
        transactionId: txResponse.transactionId.toString(),
        status: receipt.status.toString()
      };

    } catch (error) {
      console.error('❌ Error purchasing product:', error.message);
      throw error;
    }
  }

async getProduct(productId) {
  if (!this.initialized) {
    await this.initialize();
  }

  if (!this.client) {
    throw new Error('MarketplaceContract service not initialized');
  }

  try {
    const params = new ContractFunctionParameters()
      .addUint256(productId);

    const query = new ContractCallQuery()
      .setContractId(this.contractId)
      .setGas(100000)
      .setFunction("getProduct", params);

    const result = await query.execute(this.client);
    
    // ✨ Use ethers.js to properly decode the struct
    const ethers = require('ethers');
    const bytes = result.asBytes();
    
    // Convert Uint8Array to hex string
    const hexString = '0x' + Buffer.from(bytes).toString('hex');
    
    // ABI for Product struct return
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    const decoded = abiCoder.decode(
      [
        'tuple(uint256 id, string name, string description, string category, uint256 priceTokens, uint256 stock, string imageUrl, bool isActive)'
      ],
      hexString
    );

    const product = decoded[0];

    return {
      id: Number(product.id),
      name: product.name,
      description: product.description,
      category: product.category,
      priceTokens: Number(product.priceTokens),
      stock: Number(product.stock),
      imageUrl: product.imageUrl,
      isActive: product.isActive
    };

  } catch (error) {
    console.error('❌ Error querying product:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

  async getNFT(nftId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MarketplaceContract service not initialized');
    }

    try {
      const params = new ContractFunctionParameters()
        .addUint256(nftId);

      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("getNFT", params);

      const result = await query.execute(this.client);

      return {
        id: result.getUint256(0).toNumber(),
        productId: result.getUint256(1).toNumber(),
        owner: result.getAddress(2),
        purchaseDate: result.getUint256(3).toNumber(),
        isUsed: result.getBool(4),
        usedDate: result.getUint256(5).toNumber(),
        metadata: result.getString(6)
      };

    } catch (error) {
      console.error('❌ Error querying NFT:', error.message);
      return null;
    }
  }

  async getNFTOwner(nftId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MarketplaceContract service not initialized');
    }

    try {
      const params = new ContractFunctionParameters()
        .addUint256(nftId);

      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("getNFTOwner", params);

      const result = await query.execute(this.client);
      return result.getAddress(0);

    } catch (error) {
      console.error('❌ Error querying NFT owner:', error.message);
      return null;
    }
  }

  async isNFTUsed(nftId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MarketplaceContract service not initialized');
    }

    try {
      const params = new ContractFunctionParameters()
        .addUint256(nftId);

      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("isNFTUsed", params);

      const result = await query.execute(this.client);
      return result.getBool(0);

    } catch (error) {
      console.error('❌ Error checking NFT status:', error.message);
      return false;
    }
  }

  async getUserNFTs(userAddress) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MarketplaceContract service not initialized');
    }

    try {
      const evmAddress = hederaAccountIdToEvmAddress(userAddress);
      
      const params = new ContractFunctionParameters()
        .addAddress(evmAddress);

      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("getUserNFTs", params);

      const result = await query.execute(this.client);
      
      const nftIds = [];
      const arrayLength = result.getUint256(0).toNumber();
      
      for (let i = 0; i < arrayLength; i++) {
        nftIds.push(result.getUint256(i + 1).toNumber());
      }

      return nftIds;

    } catch (error) {
      console.error('❌ Error querying user NFTs:', error.message);
      return [];
    }
  }

  async markNFTUsed(nftId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MarketplaceContract service not initialized');
    }

    try {
      console.log(`✅ Marking NFT ${nftId} as used`);

      const params = new ContractFunctionParameters()
        .addUint256(nftId);

      const transaction = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(200000)
        .setFunction("markNFTUsed", params);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      console.log(`✅ NFT marked as used! Status: ${receipt.status.toString()}`);

      return {
        success: true,
        transactionId: txResponse.transactionId.toString()
      };

    } catch (error) {
      console.error('❌ Error marking NFT as used:', error.message);
      throw error;
    }
  }

  async addProduct(product) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MarketplaceContract service not initialized');
    }

    try {
      const params = new ContractFunctionParameters()
        .addString(product.name)
        .addString(product.description || '')
        .addString(product.category || 'general')
        .addUint256(product.priceTokens)
        .addUint256(product.stock || 0)
        .addString(product.imageUrl || '');

      const transaction = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(2000000)
        .setFunction("addProduct", params);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      console.log(`✅ Product added! Status: ${receipt.status.toString()}`);

      return {
        success: true,
        transactionId: txResponse.transactionId.toString()
      };

    } catch (error) {
      console.error('❌ Error adding product:', error.message);
      throw error;
    }
  }

  async getProductCount() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MarketplaceContract service not initialized');
    }

    try {
      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("productCount");

      const result = await query.execute(this.client);
      return result.getUint256(0).toNumber();

    } catch (error) {
      console.error('❌ Error querying product count:', error.message);
      return 0;
    }
  }

  /**
   * ✨ NEW: Get total NFT count
   */
  async getNFTCount() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MarketplaceContract service not initialized');
    }

    try {
      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("getNFTCount");

      const result = await query.execute(this.client);
      return result.getUint256(0).toNumber();

    } catch (error) {
      console.error('❌ Error querying NFT count:', error.message);
      return 0;
    }
  }

  /**
   * ✨ NEW: Update product price
   */
  async updatePrice(productId, newPrice) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MarketplaceContract service not initialized');
    }

    try {
      console.log(`💰 Updating price for product ${productId} to ${newPrice} FIT`);

      const params = new ContractFunctionParameters()
        .addUint256(productId)
        .addUint256(newPrice);

      const transaction = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(200000)
        .setFunction("updatePrice", params);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      console.log(`✅ Price updated! Status: ${receipt.status.toString()}`);

      return {
        success: true,
        transactionId: txResponse.transactionId.toString()
      };

    } catch (error) {
      console.error('❌ Error updating price:', error.message);
      throw error;
    }
  }

  close() {
    if (this.client) {
      this.client.close();
      this.initialized = false;
    }
  }
}

const marketplaceContractService = new MarketplaceContractService();
module.exports = marketplaceContractService;