import { ethers } from "hardhat";
import dotenvFlow from 'dotenv-flow';
import { TestToken } from "../typechain-types";
import { requiredVar, optionalVar } from "./env-utils";

dotenvFlow.config();

// The address of where to mint test tokens to
const MINT_TARGET = requiredVar("TKA_ERC20_MINT_TARGET");

// The address of the contract. If missing, a new contract will be deployed.
const CONTRACT_ADDRESS = optionalVar("TKA_ERC20_CONTRACT_ADDRESS");

async function main() {
  if (!MINT_TARGET) {
    throw new Error('Env variable TKA_ERC20_MINT_TARGET not defined');
  }
  let tokenA: TestToken;
  if (CONTRACT_ADDRESS) {
    console.log(`Reusing contract from address ${CONTRACT_ADDRESS}`);
    tokenA = await ethers.getContractAt("TestToken", CONTRACT_ADDRESS);
  } else {
    console.log("Deploying a new 'TestToken' contract");
    tokenA = await ethers.deployContract("TestToken", ["Token A", "TKA"]);
    await tokenA.waitForDeployment();
    console.log(`TestToken contract for Token A deployed to ${tokenA.target}`);
    console.log("Set the following env variable to use the same contract next time:");
    console.log(`TKA_ERC20_CONTRACT_ADDRESS=${tokenA.target}`);
  }
  tokenA.mint(MINT_TARGET, ethers.parseEther("1000"));
  console.log(`Tokens minted to ${MINT_TARGET}.`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
