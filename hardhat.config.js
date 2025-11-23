require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  
  networks: {
    hedera_testnet: {
      // Hedera Testnet uses JSON-RPC endpoint
      url: "https://testnet.hashio.io/api",
      accounts: process.env.HEX_Encoded_Private_Key ? [process.env.HEX_Encoded_Private_Key] : [],
      chainId: 296, // Hedera testnet chain ID
      gas: "auto",
      gasPrice: "auto"
    }
  },
  
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  defaultNetwork: "hedera_testnet"
};