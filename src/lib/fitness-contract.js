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
  // Remove 0x prefix and leading zeros
  const hex = evmAddress.replace('0x', '').replace(/^0+/, '');
  const num = parseInt(hex, 16);
  return `0.0.${num}`;
}

class FitnessContractService {
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
      console.log('🔗 Initializing FitnessContract service...');

      const accountId = process.env.HEDERA_ACCOUNT_ID;
      const privateKey = process.env.HEDERA_PRIVATE_KEY;
      const contractAddress = process.env.FITNESS_CONTRACT_ADDRESS;

      if (!accountId || !privateKey) {
        throw new Error('Hedera credentials missing in .env');
      }

      if (!contractAddress) {
        console.warn('⚠️ FITNESS_CONTRACT_ADDRESS not found in .env');
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
      console.log('✅ FitnessContract service initialized');
      console.log(`   Contract Address: ${contractAddress}`);
      console.log(`   Contract ID (Hedera): ${this.contractId}`);

      return true;
    } catch (error) {
      console.error('❌ FitnessContract initialization failed:', error.message);
      return false;
    }
  }

  async updateSteps(userAddress, steps) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('FitnessContract service not initialized');
    }

    try {
      console.log(`📊 Updating steps for ${userAddress}: +${steps}`);

      const evmAddress = hederaAccountIdToEvmAddress(userAddress);

      const params = new ContractFunctionParameters()
        .addAddress(evmAddress)
        .addUint256(steps);

      const transaction = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(1000000)
        .setFunction("updateSteps", params);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      console.log(`✅ Steps updated! Status: ${receipt.status.toString()}`);
      console.log(`   Transaction ID: ${txResponse.transactionId.toString()}`);

      return {
        success: true,
        transactionId: txResponse.transactionId.toString(),
        status: receipt.status.toString()
      };

    } catch (error) {
      console.error('❌ Error updating steps:', error.message);
      throw error;
    }
  }

  async getTotalSteps(userAddress) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('FitnessContract service not initialized');
    }

    try {
      const evmAddress = hederaAccountIdToEvmAddress(userAddress);

      const params = new ContractFunctionParameters()
        .addAddress(evmAddress);

      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("getTotalSteps", params);

      const result = await query.execute(this.client);
      const steps = result.getUint256(0);

      return steps.toNumber();

    } catch (error) {
      console.error('❌ Error querying total steps:', error.message);
      return 0;
    }
  }

  async getChallengeProgress(userAddress, challengeId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('FitnessContract service not initialized');
    }

    try {
      const evmAddress = hederaAccountIdToEvmAddress(userAddress);

      const params = new ContractFunctionParameters()
        .addAddress(evmAddress)
        .addUint256(challengeId);

      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("getChallengeProgress", params);

      const result = await query.execute(this.client);
      const progress = result.getUint256(0);

      return progress.toNumber();

    } catch (error) {
      console.error('❌ Error querying challenge progress:', error.message);
      return 0;
    }
  }

  async isChallengeCompleted(userAddress, challengeId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('FitnessContract service not initialized');
    }

    try {
      const evmAddress = hederaAccountIdToEvmAddress(userAddress);

      const params = new ContractFunctionParameters()
        .addAddress(evmAddress)
        .addUint256(challengeId);

      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("isChallengeCompleted", params);

      const result = await query.execute(this.client);
      return result.getBool(0);

    } catch (error) {
      console.error('❌ Error checking challenge completion:', error.message);
      return false;
    }
  }

  async getContractBalance() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('FitnessContract service not initialized');
    }

    try {
      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("getContractBalance");

      const result = await query.execute(this.client);
      const balance = result.getUint256(0);

      return balance.toNumber();

    } catch (error) {
      console.error('❌ Error querying contract balance:', error.message);
      return 0;
    }
  }

  async getChallenge(challengeId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('FitnessContract service not initialized');
    }

    try {
      const params = new ContractFunctionParameters()
        .addUint256(challengeId);

      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("getChallenge", params);

      const result = await query.execute(this.client);

      // Parse the Challenge struct
      return {
        id: result.getUint256(0).toNumber(),
        title: result.getString(1),
        challengeType: result.getString(2),
        target: result.getUint256(3).toNumber(),
        reward: result.getUint256(4).toNumber(),
        level: result.getUint256(5).toNumber(),
        isActive: result.getBool(6)
      };

    } catch (error) {
      console.error('❌ Error querying challenge:', error.message);
      throw error;
    }
  }

  async getChallengeCount() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('FitnessContract service not initialized');
    }

    try {
      const query = new ContractCallQuery()
        .setContractId(this.contractId)
        .setGas(100000)
        .setFunction("challengeCount");

      const result = await query.execute(this.client);
      return result.getUint256(0).toNumber();

    } catch (error) {
      console.error('❌ Error querying challenge count:', error.message);
      return 0;
    }
  }

  async addChallenge(challenge) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('FitnessContract service not initialized');
    }

    try {
      const params = new ContractFunctionParameters()
        .addString(challenge.title)
        .addString(challenge.type)
        .addUint256(challenge.target)
        .addUint256(challenge.reward)
        .addUint256(challenge.level);

      const transaction = new ContractExecuteTransaction()
        .setContractId(this.contractId)
        .setGas(300000)
        .setFunction("addChallenge", params);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      console.log(`✅ Challenge added! Status: ${receipt.status.toString()}`);

      return {
        success: true,
        transactionId: txResponse.transactionId.toString()
      };

    } catch (error) {
      console.error('❌ Error adding challenge:', error.message);
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

const fitnessContractService = new FitnessContractService();
module.exports = fitnessContractService;









