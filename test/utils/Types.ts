import { BigNumberish } from "ethers";

// Define the DepositIntent type
export type DepositIntent = {
  sender: string;
  tokenAddress: string;
  initiatorAddress: string;
  receiverId: string;
  amount: BigNumberish;
};

// Define the WithdrawalIntent type
export type WithdrawalIntent = {
  tokenAddress: string;
  withdrawalAddress: string;
  initiatorAddress: string;
  amount: BigNumberish;
};

export const DepositIntentAbiType: string = `tuple(
  address sender,
  address tokenAddress,
  address initiatorAddress,
  string receiverId,
  uint256 amount
)`;

export const WithdrawalIntentAbiType: string = `tuple(
  address tokenAddress,
  address withdrawalAddress,
  address initiatorAddress,
  uint256 amount
)`;
