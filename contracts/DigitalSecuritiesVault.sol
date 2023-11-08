// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DigitalSecuritiesVault is AccessControl {
    // -- roles for AccessControl
    bytes32 private constant OPERATOR = keccak256("OPERATOR");
    // --

    // -- data
    struct DepositIntent {
        address sender;
        address tokenAddress;
        address initiatorAddress;
        string receiverId;
        uint amount;
    }

    struct WithdrawalIntent {
        address tokenAddress;
        address withdrawalAddress;
        address initiatorAddress;
        uint amount;
    }

    mapping(bytes32 => bool) activeDepositIntents;
    mapping(bytes32 => bool) activeWithdrawalIntents;
    // --

    // -- events --
    event DepositIntentSubmitted(
        address sender,
        address tokenAddress,
        address receiverAddress,
        string receiverId,
        uint amount
    );
    event DepositIntentCancelled(bytes32 indexed intentHash);
    event DepositIntentSatisfied(
        address sender,
        address tokenAddress,
        address receiverAddress,
        string receiverId,
        uint amount
    );

    event WithdrawalIntentSubmitted(
        address tokenAddress,
        address withdrawalAddress,
        address initiatorAddress,
        uint amount
    );
    event WithdrawalIntentCancelled(bytes32 indexed intentHash);
    event WithdrawalIntentConfirmed(
        address tokenAddress,
        address withdrawalAddress,
        address initiatorAddress,
        uint amount
    );
    // --

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function submitDepositIntent(
        DepositIntent calldata depositIntent
    ) external returns (bytes32) {
        // are more requirements neccessary?
        require(depositIntent.amount > 0, "The deposit amount cannot be 0");
        require(
            depositIntent.sender != msg.sender,
            "The intended sender cannot be the deposit intent submitter"
        );
        require(
            depositIntent.initiatorAddress == msg.sender,
            "The intended receiver must be the deposit intent submitter"
        );

        // Compute the intent hash
        bytes32 intentHash = keccak256(abi.encode(depositIntent));
        require(
            !activeDepositIntents[intentHash],
            "The deposit intent you are trying to submit is already active"
        );
        activeDepositIntents[intentHash] = true;

        emit DepositIntentSubmitted(
            depositIntent.sender,
            depositIntent.tokenAddress,
            depositIntent.initiatorAddress,
            depositIntent.receiverId,
            depositIntent.amount
        );

        return intentHash;
    }

    function cancelDepositIntent(
        DepositIntent calldata depositIntent
    ) external {
        require(
            hasRole(OPERATOR, msg.sender) ||
                msg.sender == depositIntent.initiatorAddress,
            "Can only be cancelled by Initiator or Operator."
        );
        // Verify that the provided depositIntent is active
        bytes32 intentHash = keccak256(abi.encode(depositIntent));
        require(
            isDepositIntentActive(intentHash),
            "Deposit intent is not active"
        );

        delete activeDepositIntents[intentHash];
        emit DepositIntentCancelled(intentHash);
    }

    function isDepositIntentActive(
        bytes32 intentHash
    ) public view returns (bool) {
        return activeDepositIntents[intentHash];
    }

    function satisfyDepositIntent(
        DepositIntent calldata depositIntent
    ) external {
        // Compute the intent hash
        bytes32 intentHash = keccak256(abi.encode(depositIntent));
        require(
            isDepositIntentActive(intentHash),
            "Deposit intent is not active"
        );

        IERC20 token = IERC20(depositIntent.tokenAddress);
        require(
            token.allowance(depositIntent.sender, address(this)) >=
                depositIntent.amount,
            "Insufficient allowance for ERC20 token"
        );

        require(
            token.transferFrom(
                depositIntent.sender,
                address(this),
                depositIntent.amount
            ),
            "Token transfer failed"
        );
        delete activeDepositIntents[intentHash];
        emit DepositIntentSatisfied(
            depositIntent.sender,
            depositIntent.tokenAddress,
            depositIntent.initiatorAddress,
            depositIntent.receiverId,
            depositIntent.amount
        );
    }

    function submitWithdrawalIntent(
        WithdrawalIntent calldata withdrawalIntent
    ) external returns (bytes32) {
        require(
            withdrawalIntent.amount > 0,
            "The withdrawal amount cannot be 0"
        );
        require(
            withdrawalIntent.initiatorAddress == msg.sender,
            "The withdrawal intent must be submitted from the initiator address"
        );
        require(
            !hasRole(OPERATOR, msg.sender),
            "A withdrawal intent cannot be submitted from a withdrawal operator"
        );

        // Compute the intent hash
        bytes32 intentHash = keccak256(abi.encode(withdrawalIntent));
        require(
            !activeWithdrawalIntents[intentHash],
            "The withdrawal intent you are trying to submit is already active"
        );

        activeWithdrawalIntents[intentHash] = true;
        emit WithdrawalIntentSubmitted(
            withdrawalIntent.tokenAddress,
            withdrawalIntent.withdrawalAddress,
            withdrawalIntent.initiatorAddress,
            withdrawalIntent.amount
        );
        return intentHash;
    }

    function confirmWithdrawalIntent(
        WithdrawalIntent calldata withdrawalIntent
    ) external onlyRole(OPERATOR) {
        bytes32 intentHash = keccak256(abi.encode(withdrawalIntent));
        require(
            isWithdrawalIntentActive(intentHash),
            "Withdrawal intent is not active"
        );

        IERC20 token = IERC20(withdrawalIntent.tokenAddress);
        require(
            token.transfer(
                withdrawalIntent.withdrawalAddress,
                withdrawalIntent.amount
            ),
            "Token transfer failed"
        );
        delete activeWithdrawalIntents[intentHash];
        emit WithdrawalIntentConfirmed(
            withdrawalIntent.tokenAddress,
            withdrawalIntent.withdrawalAddress,
            withdrawalIntent.initiatorAddress,
            withdrawalIntent.amount
        );
    }

    function cancelWithdrawalIntent(
        WithdrawalIntent calldata withdrawalIntent
    ) external {
        require(
            hasRole(OPERATOR, msg.sender) ||
                msg.sender == withdrawalIntent.initiatorAddress,
            "Can only be cancelled by Initiator or Operator."
        );
        // Verify that the provided depositIntent is active
        bytes32 intentHash = keccak256(abi.encode(withdrawalIntent));
        require(
            isWithdrawalIntentActive(intentHash),
            "Withdrawal intent is not active"
        );
        delete activeWithdrawalIntents[intentHash];
        emit WithdrawalIntentCancelled(intentHash);
    }

    function isWithdrawalIntentActive(
        bytes32 intentHash
    ) public view returns (bool) {
        return activeWithdrawalIntents[intentHash];
    }

    receive() external payable {
        revert("Ether payments not allowed");
    }
}
