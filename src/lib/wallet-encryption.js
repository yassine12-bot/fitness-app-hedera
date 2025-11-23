const crypto = require('crypto');

/**
 * Wallet Encryption Helper
 * Encrypts/decrypts Hedera private keys for secure storage
 */

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'hedera-fit-secret-key-change-me-32b';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt a Hedera private key for storage
 * @param {string} privateKey - Hedera private key (hex string)
 * @returns {string} Encrypted data in format "iv:encrypted"
 */
function encryptPrivateKey(privateKey) {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a stored Hedera private key
 * @param {string} encryptedData - Encrypted data in format "iv:encrypted"
 * @returns {string} Decrypted private key
 */
function decryptPrivateKey(encryptedData) {
  if (!encryptedData) {
    throw new Error('No encrypted data provided');
  }
  
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = {
  encryptPrivateKey,
  decryptPrivateKey
};