# Digital Securities Vault Contracts

This project (Digital Securities Vault) is a **smart contract** developed for the
EVM (Ethereum Virtual Machine).

It's designed to facilitate the deposit and withdrawal of ERC20 tokens in a secure and
controlled manner. The contract uses the OpenZeppelin library for access control,
allowing specific roles to perform certain actions.

There is a companion web app called
[Digital Securities Vault App](https://github.com/six-group/digital-securities-vault-app-hack-n-lead-2023/).

## Features

- **Deposit Intent:** Users can submit a deposit intent, which includes the sender's address,
  the token address, the receiver's UUID, and the amount to be deposited. Once the deposit intent
  is submitted, it becomes active and can be satisfied or cancelled.

- **Withdrawal Intent:** Users can also submit a withdrawal intent, which includes the token
  address, the withdrawal address, the initiator's address, and the amount to be withdrawn.
  Similar to the deposit intent, the withdrawal intent becomes active upon submission and can be
  confirmed or cancelled.

- **Access Control:** The contract uses OpenZeppelin's AccessControl for role-based access
  control. It defines an OPERATOR role that can cancel and confirm deposit and withdrawal
  intents and an ADMIN role which is able to add and remove operators.

- **Incoming tokens:** This contract does not accept Ether payments and will revert any
  transactions that include Ether. Note that the same is not possible for ERC-20 tokens
  (due to EVM restrictions).

## Expected Workflow

### Deposits

1. A user submits a deposit intent.
2. A (possibly different) user satisfies the deposit intent. The contract will try to take
   the indicated tokens from the user who satisfies the deposit. It is then assumed that the
   user has set enough allowance for this. Afterwards, the intent is considered completed
   and set as inactive in the mapping.

### Withdrawals

1. A non-operator user submits a withdrawal intent.
2. An operator must confirm the withdrawal intent. This will take the indicated tokens out
   of the contract and to the specified withdrawal address. After this the intent is considered
   completed and set as inactive in the mapping.

## Notes

- The smart contract does not keep account of balances. It only needs to know its own balance
  for each token. But this can be found by quering the ERC-20 contracts.
- Both types of intents can be cancelled with the corresponding cancel methods.
- The smart contract needs at least one operator to be able to function properly. This has to
  be taken care of separately; at deployment only the admin role is set to the deployer's address.

### Hashes

- Each intent is hashed at submission. There is a mapping for each type of intent that maps hashes
  to booleans and indicates if a given intent is active.
- At every operation after submission this mapping is checked to verify that the intent that is
  being confirmed or cancelled is currently active. After such an operation it will be turned
  to inactive.
- Since each intent is defined by its hash, we cannot have two active intents with the same
  contents at the same time.
- The hashing process takes place also on the side of the frontend app. This means that we can
  match an intent produced off-chain with its on-chain counterpart. For this, we have to make
  sure to use the EVM native hashing algorithm keccak256 in the app. Note that ethers library
  provides this with `solidityKeccak256`.

## Project

This is a [Hardhat](https://hardhat.org/) project.

### Requirements for development

You will need to install the following apps:

- [Node.js](https://nodejs.org/)
- [yarn](https://yarnpkg.com/)
- [Metamask](https://metamask.io/) browser extension

So make sure you have those installed before proceeding.

You will also need an [Alchemy](https://dashboard.alchemy.com/) account. So go there
and create one.

### Configuration

#### Metamask accounts

You will need to add a few accounts in Metamask that we will be using for development.
[Here are instructions](https://support.metamask.io/hc/en-us/articles/360015289452-How-to-add-accounts-in-your-wallet)
if you are not familiar with that tool.

We suggest that you add 4 accounts with the following suggested labels:

- Admin
- Operator
- Member 1
- Member 2
- Depositor

You can choose whatever labels you want, but we will be refering to those names
throught out this doc.

If you are unfamiliar with how this works, each account is represented by a
public key (that looks like this: `0xf2E9284De37f6A82605BE3C625fcAccA3E2799E0`)
and internally they have a private key that is used to control the account
(that looks like this: `06bc03591c803a3ae1c71d2464c90ab67ff1acc1b1d4a6c639f8b3dc668808cb`).

Instructions for finding them in Metamask:

- [Public key](https://support.metamask.io/hc/en-us/articles/360015488791-How-to-view-your-account-details-and-public-address)
- [Private key](https://support.metamask.io/hc/en-us/articles/360015289632-How-to-export-an-account-s-private-key).

We are going to be using the [Sepolia Testnet](https://sepolia.dev/), so make sure you
select that from the list of Networks in Metamask
([instructions](https://support.metamask.io/hc/en-us/articles/13946422437147-How-to-view-testnets-in-MetaMask)).

As a last step, we need to load some ETH in the Admin account, which will be used for
paying transaction fees. Don't worry, this is a test network, so money is free :)

For that, go to <https://sepoliafaucet.com/>, paste the public key for your
Admin account and send ETH to it.

#### Alchemy app

You will need an Alchemy app to interact with the ETH Network.

For that, go to <https://dashboard.alchemy.com/apps> and click on "Create New App".

You can choose whatever name or description that you want, but make sure that:

- Chain is "Ethereum"
- Network is "Ethereum Sepolia"

Once the app is created click on the "API key" button and take note of the:

- API key: It looks like this: `dso6YqW-khWzX-NWpZBhN_UtH9_Yq0SM`
- HTTPS url: It looks like this `https://eth-sepolia.g.alchemy.com/v2/dso6YqW-khWzX-NWpZBhN_UtH9_Yq0SM`
  - Note that the url includes the API key.

#### Env variables

The last step to be able to work with the app is to configure some env variables
so that the app knows about the things we configured in the previous steps.

For that, create a file named `.env.local` at the root of the project and paste
there the content of the `.env`.

Follow the instructions in the file itself to fill in the variables. You can ignore
everything related to `TKA_ERC20_` for now.

### Code organization

The code is organized in the following folders:

- `contracts` contains all the contracts in [Solidity](https://soliditylang.org/) language
- `scripts` contains TypeScript code that deploys the contracts using libraries from Hardhat.

### Build and run

#### Build

Download and install all dependencies first:

```bash
yarn
```

Compile Hardhat (this will take the contracts from the `contracts` folder
and generate TypeScript code for them):

```bash
yarn hardhat compile
```

You can delete everthing that the `yarn hardhat compile` generates with:

```bash
 yarn hardhat clean
 ```

To run the tests:

```bash
yarn hardhat test
```

An Ethereum network can be run on the localhost with (this is more advanced
and many of the instructions from above don't apply if you decide to
go this way):

```bash
yarn hardhat node
```

#### Run

The contract can be deployed with:

```bash
yarn hardhat run scripts/deploy.ts --network sepolia
```

where `sepolia` could also be `localhost` for a more advanced use case.

Example of running that and its output:

```text
$ yarn hardhat run scripts/deploy.ts --network sepolia
yarn run v1.22.5
digital-securities-vault-contracts/node_modules/.bin/hardhat run scripts/deploy.ts --network sepolia
DSV deployed to 0xAfeCAe17c075b172ec468C9e22542a3A1C589cD7
Done in 37.14s.
```

Take note of the contract address (the line that says
`DSV deployed to`) because you will need it when configuring
 [Digital Securities Vault App](https://github.com/six-group/digital-securities-vault-app-hack-n-lead-2023/).

## TestToken app

This project also contains a demo app that shows you how to mint ERC20 tokens
to an account.

The contract is called `TestToken`.

In order to run it, you need to finish configuring the `TKA_ERC20_` in the `.env.local` file.

So, fill in `TKA_ERC20_MINT_TARGET` with the public key of the Depositor account you
created in MetaMask and then run this:

```bash
yarn hardhat run scripts/deployToken.ts --network sepolia
```

The output looks like this:

```text
$ yarn hardhat run scripts/deployToken.ts --network sepolia
yarn run v1.22.5
digital-securities-vault-contracts/node_modules/.bin/hardhat run scripts/deployToken.ts --network sepolia
Deploying a new 'TestToken' contract
TestToken contract for Token A deployed to 0x6799d9e2D93Af68D26fCCeCE7fD4f7ABD880857d
Set the following env variable to use the same contract next time:
TKA_ERC20_CONTRACT_ADDRESS=0x6799d9e2D93Af68D26fCCeCE7fD4f7ABD880857d
Tokens minted to 0x544006AD18240184d985141317Da3430E11cCaB3.
Done in 34.05s.
```

If you run the command again, it will generate yet another contract address with
the same code.

So, in order to issue more tokens with the same contract address, you need to
follow the instructions from the output. For the example, above, that means adding
the following to `.env.local`

```bash
TKA_ERC20_CONTRACT_ADDRESS=0x6799d9e2D93Af68D26fCCeCE7fD4f7ABD880857d
```

So, when you run the `deployToken.ts` script again, the output will reflect
the fact that it is the same contract as before:

```text
$ yarn hardhat run scripts/deployToken.ts --network sepolia
yarn run v1.22.5
digital-securities-vault-contracts/node_modules/.bin/hardhat run scripts/deployToken.ts --network sepolia
Reusing contract from address 0x6799d9e2D93Af68D26fCCeCE7fD4f7ABD880857d
Tokens minted to 0x544006AD18240184d985141317Da3430E11cCaB3.
Done in 26.03s.
```

If you want to mint to other accounts, feel free to set other public keys
in the `TKA_ERC20_MINT_TARGET` env variable and run the command again.

In order to see those tokens from the target accounts, you need to add a custom token
from Metamask for each account where you minted tokens. Follow 
[these instructions](https://support.metamask.io/hc/en-us/articles/360015489031-How-to-display-tokens-in-MetaMask#h_01FWH492CHY60HWPC28RW0872H)
to do so.
