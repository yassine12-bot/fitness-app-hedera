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
 * FitnessContract Service - UPDATED
 * Added: getUserLevel, addChallenge with type, completeSocialChallenge
 */

class FitnessContractService {
  constructor() {
    this.contractId = null;
    this.operatorId = null;
    this.operatorKey = null;
    this.client = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    this.contractId = process.env.FITNESS_CONTRACT_ADDRESS;
    this.operatorId = process.env.HEDERA_ACCOUNT_ID;
    this.operatorKey = process.env.HEDERA_PRIVATE_KEY;

    if (!this.contractId || !this.operatorId || !this.operatorKey) {
      throw new Error('Missing required environment variables');
    }

    this.client = Client.forTestnet();
    this.client.setOperator(
      AccountId.fromString(this.operatorId),
      PrivateKey.fromString(this.operatorKey)
    );

    this.initialized = true;
    console.log('✅ FitnessContract service initialized');
    console.log(`   Contract: ${this.contractId}`);
  }

  hederaAccountIdToEvmAddress(accountId) {
    const parts = accountId.split('.');
    const accountNum = parts[2];
    const hexNum = parseInt(accountNum).toString(16).padStart(8, '0');
    return '0x' + '0'.repeat(32) + hexNum;
  }

  async updateSteps(userId, steps) {
    await this.initialize();

    console.log(`📊 Updating steps for ${userId}: +${steps}`);

    const evmAddress = this.hederaAccountIdToEvmAddress(userId);

    const params = new ContractFunctionParameters()
      .addAddress(evmAddress)
      .addUint256(steps);

    const transaction = new ContractExecuteTransaction()
      .setContractId(this.contractId)
      .setGas(1500000)
      .setFunction('updateSteps', params);

    const txResponse = await transaction.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    console.log(`✅ Steps updated! Status: ${receipt.status.toString()}`);

    return {
      success: true,
      transactionId: txResponse.transactionId.toString(),
      status: receipt.status.toString()
    };
  }

  async getTotalSteps(userId) {
    await this.initialize();

    const evmAddress = this.hederaAccountIdToEvmAddress(userId);

    const params = new ContractFunctionParameters().addAddress(evmAddress);

    const query = new ContractCallQuery()
      .setContractId(this.contractId)
      .setGas(300000)
      .setFunction('getTotalSteps', params);

    const result = await query.execute(this.client);
    return result.getUint256(0).toNumber();
  }

  /**
   * NEW: Get user level
   */
  async getUserLevel(userId) {
    await this.initialize();

    const evmAddress = this.hederaAccountIdToEvmAddress(userId);

    const params = new ContractFunctionParameters().addAddress(evmAddress);

    const query = new ContractCallQuery()
      .setContractId(this.contractId)
      .setGas(300000)
      .setFunction('getUserLevel', params);

    const result = await query.execute(this.client);
    return result.getUint256(0).toNumber();
  }

  async getChallenge(challengeId) {
  await this.initialize();

  const params = new ContractFunctionParameters().addUint256(challengeId);

  const query = new ContractCallQuery()
    .setContractId(this.contractId)
    .setGas(300000)
    .setFunction('getChallenge', params);

  const result = await query.execute(this.client);

  // ✅ Contract returns 4 separate values, NOT a struct
  return {
    id: challengeId,
    target: result.getUint256(0).toNumber(),
    reward: result.getUint256(1).toNumber(),
    level: result.getUint256(2).toNumber(),
    isActive: result.getBool(3)
  };
}

  async getChallengeProgress(userId, challengeId) {
    await this.initialize();

    const evmAddress = this.hederaAccountIdToEvmAddress(userId);

    const params = new ContractFunctionParameters()
      .addAddress(evmAddress)
      .addUint256(challengeId);

    const query = new ContractCallQuery()
      .setContractId(this.contractId)
      .setGas(300000) // ✅ Increased to match marketplace
      .setFunction('getChallengeProgress', params);

    const result = await query.execute(this.client);
    return result.getUint256(0).toNumber();
  }

  async isChallengeCompleted(userId, challengeId) {
    await this.initialize();

    const evmAddress = this.hederaAccountIdToEvmAddress(userId);

    const params = new ContractFunctionParameters()
      .addAddress(evmAddress)
      .addUint256(challengeId);

    const query = new ContractCallQuery()
      .setContractId(this.contractId)
      .setGas(300000) // ✅ Increased to match marketplace
      .setFunction('isChallengeCompleted', params);

    const result = await query.execute(this.client);
    return result.getBool(0);
  }

  async getChallengeCount() {
    await this.initialize();

    const query = new ContractCallQuery()
      .setContractId(this.contractId)
      .setGas(300000)
      .setFunction('challengeCount');

    const result = await query.execute(this.client);
    return result.getUint256(0).toNumber();
  }

  async getContractBalance() {
    await this.initialize();

    const query = new ContractCallQuery()
      .setContractId(this.contractId)
      .setGas(300000)
      .setFunction('getContractBalance');

    const result = await query.execute(this.client);
    return result.getUint256(0).toNumber();
  }

  /**
   * NEW: Add challenge with type parameter
   */
  async addChallenge(target, reward, level, type) {
    await this.initialize();

    const params = new ContractFunctionParameters()
      .addUint256(target)
      .addUint256(reward)
      .addUint256(level)
      .addUint256(type);

    const transaction = new ContractExecuteTransaction()
      .setContractId(this.contractId)
      .setGas(300000)
      .setFunction('addChallenge', params);

    const txResponse = await transaction.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    return {
      success: true,
      transactionId: txResponse.transactionId.toString(),
      status: receipt.status.toString()
    };
  }

  /**
   * NEW: Complete social challenge manually
   */
  async completeSocialChallenge(userId, challengeId) {
    await this.initialize();

    const evmAddress = this.hederaAccountIdToEvmAddress(userId);

    const params = new ContractFunctionParameters()
      .addAddress(evmAddress)
      .addUint256(challengeId);

    const transaction = new ContractExecuteTransaction()
      .setContractId(this.contractId)
      .setGas(500000)
      .setFunction('completeSocialChallenge', params);

    const txResponse = await transaction.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    return {
      success: true,
      transactionId: txResponse.transactionId.toString(),
      status: receipt.status.toString()
    };
  }
}

const fitnessContractService = new FitnessContractService();
module.exports = fitnessContractService;