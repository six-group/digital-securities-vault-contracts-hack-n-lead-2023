import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenvFlow from 'dotenv-flow';
import { requiredVar } from "./scripts/env-utils";

dotenvFlow.config();

const SEPOLIA_RPC = requiredVar("SEPOLIA_RPC");
// Deployer private key, which is also the account that will obtain 
// the DEFAULT_ADMIN_ROLE from AccessControl.
const DEPLOYER_PRIV_KEY = requiredVar("DEPLOYER_PRIV_KEY");

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC,
      accounts: [DEPLOYER_PRIV_KEY],
    },
  },
};

export default config;
