import { ethers } from "hardhat";

async function main() {
  const dsv = await ethers.deployContract("DigitalSecuritiesVault");
  await dsv.waitForDeployment();
  console.log(`DSV deployed to ${dsv.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
