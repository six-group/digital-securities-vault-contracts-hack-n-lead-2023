import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  DepositIntent,
  DepositIntentAbiType,
  WithdrawalIntent,
  WithdrawalIntentAbiType,
} from "./utils/Types";

const coder = ethers.AbiCoder.defaultAbiCoder();

function computeDepositIntentHash(depositIntent: DepositIntent) {
  return ethers.keccak256(
    coder.encode([DepositIntentAbiType], [depositIntent])
  );
}

function computeWithdrawalIntentHash(withdrawalIntent: WithdrawalIntent) {
  return ethers.keccak256(
    coder.encode([WithdrawalIntentAbiType], [withdrawalIntent])
  );
}

describe("DigitalSecuritiesVault", function () {
  async function deployDigitalSecuritiesVaultFixture() {
    const [
      admin,
      tokenDeployer,
      operator,
      custodianA,
      custodianB,
      custodianC,
      custodianD,
    ] = await ethers.getSigners();

    const DigitalSecuritiesVault = await ethers.getContractFactory(
      "DigitalSecuritiesVault"
    );
    const digitalSecuritiesVault = await DigitalSecuritiesVault.deploy();
    const TestToken = await ethers.getContractFactory("TestToken");
    const tokenA = await TestToken.connect(tokenDeployer).deploy(
      "Token A",
      "TKA"
    );

    await tokenA.mint(custodianA.address, ethers.parseEther("1000"));

    const depositIntent: DepositIntent = {
      sender: custodianA.address,
      tokenAddress: await tokenA.getAddress(),
      initiatorAddress: custodianB.address,
      receiverId: "receiverId",
      amount: ethers.parseEther("100"),
    };

    const withdrawalIntent: WithdrawalIntent = {
      tokenAddress: await tokenA.getAddress(),
      withdrawalAddress: custodianD.address,
      initiatorAddress: custodianC.address,
      amount: ethers.parseEther("60"),
    };

    return {
      digitalSecuritiesVault,
      tokenA,
      admin,
      operator,
      custodianA,
      custodianB,
      custodianC,
      custodianD,
      depositIntent,
      withdrawalIntent,
    };
  }

  describe("Deployment", function () {
    it("Should set the right roles", async function () {
      const { digitalSecuritiesVault, admin } = await loadFixture(
        deployDigitalSecuritiesVaultFixture
      );

      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

      expect(
        await digitalSecuritiesVault.hasRole(DEFAULT_ADMIN_ROLE, admin.address)
      ).to.be.true;
    });
  });

  describe("Deposit Intent", function () {
    it("Should submit a deposit intent correctly", async function () {
      const {
        digitalSecuritiesVault,
        admin,
        tokenA,
        custodianB,
        depositIntent,
      } = await loadFixture(deployDigitalSecuritiesVaultFixture);

      const intentHash = computeDepositIntentHash(depositIntent);

      await expect(
        digitalSecuritiesVault
          .connect(custodianB)
          .submitDepositIntent(depositIntent)
      )
        .to.emit(digitalSecuritiesVault, "DepositIntentSubmitted")
        .withArgs(
          depositIntent.sender,
          depositIntent.tokenAddress,
          depositIntent.initiatorAddress,
          depositIntent.receiverId,
          depositIntent.amount
        );

      expect(await digitalSecuritiesVault.isDepositIntentActive(intentHash)).to
        .be.true;
    });

    it("Should prevent multiple deposit intents with the same details", async function () {
      const { digitalSecuritiesVault, custodianB, depositIntent } =
        await loadFixture(deployDigitalSecuritiesVaultFixture);

      await digitalSecuritiesVault
        .connect(custodianB)
        .submitDepositIntent(depositIntent);

      await expect(
        digitalSecuritiesVault
          .connect(custodianB)
          .submitDepositIntent(depositIntent)
      ).to.be.revertedWith(
        "The deposit intent you are trying to submit is already active"
      );
    });

    it("Should cancel a deposit intent correctly", async function () {
      const {
        digitalSecuritiesVault,
        admin,
        operator,
        custodianB,
        depositIntent,
      } = await loadFixture(deployDigitalSecuritiesVaultFixture);

      const intentHash = computeDepositIntentHash(depositIntent);

      await digitalSecuritiesVault
        .connect(admin)
        .grantRole(ethers.id("OPERATOR"), operator.address);

      await digitalSecuritiesVault
        .connect(custodianB)
        .submitDepositIntent(depositIntent);

      await expect(
        digitalSecuritiesVault
          .connect(operator)
          .cancelDepositIntent(depositIntent)
      )
        .to.emit(digitalSecuritiesVault, "DepositIntentCancelled")
        .withArgs(intentHash);

      await digitalSecuritiesVault
        .connect(custodianB)
        .submitDepositIntent(depositIntent);

      await expect(
        digitalSecuritiesVault
          .connect(custodianB)
          .cancelDepositIntent(depositIntent)
      )
        .to.emit(digitalSecuritiesVault, "DepositIntentCancelled")
        .withArgs(intentHash);

      expect(await digitalSecuritiesVault.isDepositIntentActive(intentHash)).to
        .be.false;
    });

    it("Should satisfy a deposit intent correctly", async function () {
      const {
        digitalSecuritiesVault,
        admin,
        operator,
        tokenA,
        custodianA,
        custodianB,
        depositIntent,
      } = await loadFixture(deployDigitalSecuritiesVaultFixture);

      const intentHash = computeDepositIntentHash(depositIntent);

      await digitalSecuritiesVault
        .connect(admin)
        .grantRole(ethers.id("OPERATOR"), operator.address);

      await digitalSecuritiesVault
        .connect(custodianB)
        .submitDepositIntent(depositIntent);

      await tokenA
        .connect(custodianA)
        .approve(digitalSecuritiesVault.getAddress(), depositIntent.amount);

      await expect(
        digitalSecuritiesVault
          .connect(operator)
          .satisfyDepositIntent(depositIntent)
      )
        .to.emit(digitalSecuritiesVault, "DepositIntentSatisfied")
        .withArgs(
          depositIntent.sender,
          depositIntent.tokenAddress,
          depositIntent.initiatorAddress,
          depositIntent.receiverId,
          depositIntent.amount
        );

      expect(
        await tokenA.balanceOf(digitalSecuritiesVault.getAddress())
      ).to.be.equal(ethers.parseEther("100"));

      expect(await digitalSecuritiesVault.isDepositIntentActive(intentHash)).to
        .be.false;
    });
  });

  describe("Withdrawal Intent", function () {
    async function deployAndDepositFixture() {
      const {
        digitalSecuritiesVault,
        admin,
        operator,
        tokenA,
        custodianA,
        custodianB,
        custodianC,
        custodianD,
        depositIntent,
        withdrawalIntent,
      } = await loadFixture(deployDigitalSecuritiesVaultFixture);

      await digitalSecuritiesVault
        .connect(admin)
        .grantRole(ethers.id("OPERATOR"), operator.address);

      await digitalSecuritiesVault
        .connect(custodianB)
        .submitDepositIntent(depositIntent);

      await tokenA
        .connect(custodianA)
        .approve(digitalSecuritiesVault.getAddress(), depositIntent.amount);

      await digitalSecuritiesVault
        .connect(operator)
        .satisfyDepositIntent(depositIntent);

      await digitalSecuritiesVault
        .connect(admin)
        .grantRole(ethers.id("OPERATOR"), operator.address);

      return {
        digitalSecuritiesVault,
        tokenA,
        operator,
        custodianC,
        custodianD,
        withdrawalIntent,
      };
    }

    it("Should submit a withdrawal intent correctly", async function () {
      const { digitalSecuritiesVault, custodianC, withdrawalIntent } =
        await loadFixture(deployAndDepositFixture);

      const intentHash = computeWithdrawalIntentHash(withdrawalIntent);

      await expect(
        digitalSecuritiesVault
          .connect(custodianC)
          .submitWithdrawalIntent(withdrawalIntent)
      )
        .to.emit(digitalSecuritiesVault, "WithdrawalIntentSubmitted")
        .withArgs(
          withdrawalIntent.tokenAddress,
          withdrawalIntent.withdrawalAddress,
          withdrawalIntent.initiatorAddress,
          withdrawalIntent.amount
        );

      expect(await digitalSecuritiesVault.isWithdrawalIntentActive(intentHash))
        .to.be.true;
    });

    it("Should prevent multiple withdrawal intents with the same details", async function () {
      const { digitalSecuritiesVault, custodianC, withdrawalIntent } =
        await loadFixture(deployAndDepositFixture);

      await digitalSecuritiesVault
        .connect(custodianC)
        .submitWithdrawalIntent(withdrawalIntent);

      await expect(
        digitalSecuritiesVault
          .connect(custodianC)
          .submitWithdrawalIntent(withdrawalIntent)
      ).to.be.revertedWith(
        "The withdrawal intent you are trying to submit is already active"
      );
    });

    it("Should cancel a withdrawal intent correctly", async function () {
      const { digitalSecuritiesVault, operator, custodianC, withdrawalIntent } =
        await loadFixture(deployAndDepositFixture);

      const intentHash = computeWithdrawalIntentHash(withdrawalIntent);

      await digitalSecuritiesVault
        .connect(custodianC)
        .submitWithdrawalIntent(withdrawalIntent);

      await expect(
        digitalSecuritiesVault
          .connect(operator)
          .cancelWithdrawalIntent(withdrawalIntent)
      )
        .to.emit(digitalSecuritiesVault, "WithdrawalIntentCancelled")
        .withArgs(intentHash);

      await digitalSecuritiesVault
        .connect(custodianC)
        .submitWithdrawalIntent(withdrawalIntent);

      await expect(
        digitalSecuritiesVault
          .connect(custodianC)
          .cancelWithdrawalIntent(withdrawalIntent)
      )
        .to.emit(digitalSecuritiesVault, "WithdrawalIntentCancelled")
        .withArgs(intentHash);

      expect(await digitalSecuritiesVault.isWithdrawalIntentActive(intentHash))
        .to.be.false;
    });

    it("Should confirm a withdrawal intent correctly", async function () {
      const {
        digitalSecuritiesVault,
        tokenA,
        operator,
        custodianC,
        custodianD,
        withdrawalIntent,
      } = await loadFixture(deployAndDepositFixture);

      const intentHash = computeWithdrawalIntentHash(withdrawalIntent);

      await digitalSecuritiesVault
        .connect(custodianC)
        .submitWithdrawalIntent(withdrawalIntent);

      await expect(
        digitalSecuritiesVault
          .connect(operator)
          .confirmWithdrawalIntent(withdrawalIntent)
      )
        .to.emit(digitalSecuritiesVault, "WithdrawalIntentConfirmed")
        .withArgs(
          withdrawalIntent.tokenAddress,
          withdrawalIntent.withdrawalAddress,
          withdrawalIntent.initiatorAddress,
          withdrawalIntent.amount
        );

      expect(await digitalSecuritiesVault.isWithdrawalIntentActive(intentHash))
        .to.be.false;

      expect(await tokenA.balanceOf(digitalSecuritiesVault)).to.equal(
        ethers.parseEther("40")
      );

      expect(await tokenA.balanceOf(custodianD)).to.equal(
        ethers.parseEther("60")
      );
    });
  });

  describe("Ether Transactions", function () {
    it("Should revert when sending Ether to the contract", async function () {
      const { digitalSecuritiesVault, admin } = await loadFixture(
        deployDigitalSecuritiesVaultFixture
      );

      await expect(
        admin.sendTransaction({
          to: digitalSecuritiesVault.getAddress(),
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("Ether payments not allowed");
    });
  });
});
