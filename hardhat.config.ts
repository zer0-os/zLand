import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,   // Enable the optimizer
        runs: 200       // Adjust the number of optimization runs (200 is a common default)
      }
    }
  },  
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      sepolia: process.env.ETHERSCAN_API_KEY || ''
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    wilderDev: {
      url: "https://wilderworld-dev-erigon1-rpc.eu-north-2.gateway.fm/",
      accounts: process.env.Z_KEY !== undefined ? [process.env.Z_KEY] : [],
    }
  }
};

export default config;
