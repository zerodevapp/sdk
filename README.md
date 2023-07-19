# ZeroDev SDK

SDK for [ZeroDev](https://docs.zerodev.app/), based on [Kernel](https://github.com/zerodevapp/kernel).

## Getting started

Follow the instructions below to install the packages.

via `yarn`

```bash
yarn add @alchemy/aa-core @zerodevapp/sdk@alpha viem
```

via `npm`

```bash
npm i -s @alchemy/aa-core @zerodevapp/sdk@alpha viem
```

## Example Usage to Interact with [Kernel Accounts](https://github.com/zerodevapp/kernel/blob/main/src/Kernel.sol)

### Basic Usage

```ts
import {
  KernelSmartContractAccount,
  ZeroDevProvider,
  ECDSAValidator,
  type ValidatorMode,
} from "@zerodevapp/sdk@alpha";
import { PrivateKeySigner } from "@alchemy/aa-core";
import { polygonMumbai } from "viem/chains";

const KERNEL_ACCOUNT_FACTORY_ADDRESS =
  "0x5D006d3880645ec6e254E18C1F879DAC9Dd71A39";

// 1. define the EOA owner of the Smart Account
// This is just one exapmle of how to interact with EOAs, feel free to use any other interface
const owner = PrivateKeySigner.privateKeyToAccountSigner(PRIVATE_KEY);

// 2. Create a ZeroDev Provider
let ecdsaProvider = await ECDSAProvider.init({
  projectId, // zeroDev projectId
  owner,
  // Optional: pass the paymasterConfig to use the verifying paymaster
  // opts: {
  //     paymasterConfig: {
  //         policy: "VERIFYING_PAYMASTER"
  //     }
  // }
});

// 3. send a UserOperation
const { hash } = await ecdsaProvider.sendUserOperation({
  target: "0xTargetAddress",
  data: "0xcallData",
  value: 0n, // value: bigint or undefined
});
```

### Pay gas in ERC20

ZeroDev currently supports:

- `USDC`
- `PEPE` (mainnet only)
- `DAI` (upcoming)

Just pass the `paymasterConfig` to `createZeroDevProvider` function while creating the provider.

```ts
let ecdsaProvider = await ECDSAProvider.init({
  projectId, // zeroDev projectId
  owner,
  opts: {
    paymasterConfig: {
      policy: "TOKEN_PAYMASTER",
      gasToken: "TEST_ERC20",
    },
  },
});
```

### Change Kernel Account Owner in ECDSAValidator

```ts
// 1. Create a ECDSAValidatorProvider
const ecdsaProvider = await ECDSAProvider.init({
    projectId: "c73037ef-8c0b-48be-a581-1f3d161151d3",
    owner,
});

// 2. Change the owner of the Kernel Account
const { hash } = await ecdsaProvider.changeOwner(<NEW_OWNER_ADDRESS>);
```

### Via `ethers` Signer

```ts
import { Wallet } from "@ethersproject/wallet";
import {
  ZeroDevEthersProvider,
  convertWalletToAccountSigner,
} from "@zerodevapp/sdk@alpha";

// 1. Create an ethers Wallet
const owner = Wallet.fromMnemonic(OWNER_MNEMONIC);

// 2. Create a ZeroDev ZeroDevEthersProvider passing the ethers Wallet as the signer
const provider = await ZeroDevEthersProvider.init("ECDSA", {
  projectId, // zeroDev projectId
  owner: convertWalletToAccountSigner(owner),
  opts: {
    paymasterConfig: {
      policy: "VERIFYING_PAYMASTER",
    },
  },
});

// 3. Get the AccountSigner adapter of ethers signer
const signer = provider.getAccountSigner();

// 4. send a UserOperation
const { hash } = signer.sendUserOperation({
  target: "0xTargetAddress",
  data: "0xcallData",
  value: 0n, // value: bigint or undefined
});
```

### Via `ethers` Signer

```ts
import { Wallet } from "@ethersproject/wallet";
import {
  ZeroDevEthersProvider,
  convertEthersSignerToAccountSigner,
} from "@zerodevapp/sdk@alpha";

// 1. Create an ethers Wallet
const owner = Wallet.fromMnemonic(OWNER_MNEMONIC);

// 2. Create a ZeroDev ZeroDevEthersProvider passing the ethers Wallet as the signer
const provider = await ZeroDevEthersProvider.init("ECDSA", {
  projectId, // zeroDev projectId
  owner: convertEthersSignerToAccountSigner(owner),
  opts: {
    paymasterConfig: {
      policy: "VERIFYING_PAYMASTER",
    },
  },
});

// 3. Get the AccountSigner adapter of ethers signer
const signer = provider.getAccountSigner();

// 4. send a UserOperation
const { hash } = signer.sendUserOperation({
  target: "0xTargetAddress",
  data: "0xcallData",
  value: 0n, // value: bigint or undefined
});
```

### Via `viem` using `custom` transport which supports EIP-1193 providers

```ts
import { createWalletClient, custom } from "viem";
import { polygonMumbai } from "viem/chains";
import {
  ECDSAProvider,
  convertWalletClientToAccountSigner,
} from "@zerodevapp/sdk@alpha";

// 1. Create a Viem Wallet Client using the custom transport
const client = createWalletClient({
  chain: polygonMumbai,
  transport: custom(window.ethereum),
});

// 2. Create a ZeroDev ECDSAProvider passing the Viem Wallet Client as the signer
let ecdsaProvider = await ECDSAProvider.init({
  projectId, // zeroDev projectId
  owner: convertWalletClientToAccountSigner(client),
});

// 3. send a UserOperation
const { hash } = await ecdsaProvider.sendUserOperation({
  target: "0xTargetAddress",
  data: "0xcallData",
  value: 0n, // value: bigint or undefined
});
```

### Using [Magic](https://magic.link/)

```ts
import { ECDSAProvider, getRPCProviderOwner } from "@zerodevapp/sdk@alpha";
import { Magic } from "magic-sdk";

const magic = new Magic("MAGIC_API_KEY", {
  // magic config...
});

let ecdsaProvider = await ECDSAProvider.init({
  projectId, // zeroDev projectId
  owner: getRPCProviderOwner(magic.rpcProvider),
});
```

### Using [Web3Auth](https://web3auth.io/)

```ts
import { ECDSAProvider, getRPCProviderOwner } from "@zerodevapp/sdk@alpha";
import { Web3Auth } from "@web3auth/modal";

const web3auth = new Web3Auth({
  // web3auth config...
});

await web3auth.initModal();

web3auth.connect();

let ecdsaProvider = await ECDSAProvider.init({
  projectId, // zeroDev projectId
  owner: getRPCProviderOwner(web3auth.provider),
});
```

## Components

### Core Components

The primary interfaces are the `ZeroDevProvider`, `KernelSmartContractAccount` and `KernelBaseValidator`

The `ZeroDevProvider` is an ERC-1193 compliant Provider built on top of Alchemy's `SmartAccountProvider`

1. `sendUserOperation` -- this takes in `target`, `callData`, and an optional `value` which then constructs a UserOperation (UO), sends it, and returns the `hash` of the UO. It handles estimating gas, fetching fee data, (optionally) requesting paymasterAndData, and lastly signing. This is done via a middleware stack that runs in a specific order. The middleware order is `getDummyPaymasterData` => `estimateGas` => `getFeeData` => `getPaymasterAndData`. The paymaster fields are set to `0x` by default. They can be changed using `provider.withPaymasterMiddleware`.
2. `sendTransaction` -- this takes in a traditional Transaction Request object which then gets converted into a UO. Currently, the only data being used from the Transaction Request object is `from`, `to`, `data` and `value`. Support for other fields is coming soon.

`KernelSmartContractAccount` is Kernel's implementation of `BaseSmartContractAccount`. 6 main methods are implemented

1. `getDummySignature` -- this method should return a signature that will not `revert` during validation. It does not have to pass validation, just not cause the contract to revert. This is required for gas estimation so that the gas estimate are accurate.
2. `encodeExecute` -- this method should return the abi encoded function data for a call to your contract's `execute` method
3. `encodeExecuteDelegate` -- this method should return the abi encoded function data for a `delegate` call to your contract's `execute` method
4. `signMessage` -- this is used to sign UO Hashes
5. `signWithEip6492` -- this should return an ERC-191 and EIP-6492 compliant message used to personal_sign
6. `getAccountInitCode` -- this should return the init code that will be used to create an account if one does not exist. Usually this is the concatenation of the account's factory address and the abi encoded function data of the account factory's `createAccount` method.

The `KernelBaseValidator` is a plugin that modify how transactions are validated. It allows for extension and implementation of arbitrary validation logic. It implements 3 main methods:

1. `getAddress` -- this returns the address of the validator
2. `getOwner` -- this returns the eligible signer's address for the active smart wallet
3. `getSignature` -- this method signs the userop hash using signer object and then concats additional params based on validator mode.

## Contributing

1. clone the repo
2. run `yarn`
3. Make changes to packages

### Adding new custom validator plugin

1. Create a new validator class that extends `KernelBaseValidator` similar to [`ECDSAValidator`](`packages/accounts/src/kernel-zerodev/validator/ecdsa-validator.ts`).

2. Make sure to pass the `validatorAddress` of your validator to the `KernelBaseValidator` base class.

3. Create a new validator provider that extends `ValidatorProvider` similar to [`ECDSAValidatorProvider`](`packages/accounts/src/kernel-zerodev/validator-provider/ecdsa-provider.ts`).

4. Use the newly created validator provider as per above examples.

#### `KernelBaseValidator` methods to be implemented in your validator class

- `signer()` -- this method should return the signer as per your validator's implementation. For example, for Multi-Signature validator, this method should return one of the owner signer which is connected to the multisig wallet contract and currently using the DAPP.
- `getOwner()` -- this method should return the address of the signer. For example, for Multi-Signature validator, this method should return the address of the signer which is connected to the multisig wallet contract and currently using the DAPP.
- `getEnableData()` -- this method should return the bytes data for the `enable` method of your validator contract. For example, in ECDSA validator, this method returns `owner` address as bytes data. This method is used to enable the validator for the first time while creating the account wallet.
- `encodeEnable(enableData: Hex)` -- this method should return the abi encoded function data for the `enable` method of your validator contract. For example, in ECDSA validator, this method returns the abi encoded function data for the `enable` method with owner address as bytes param.
- `encodeDisable(disableData: Hex)` -- this method should return the abi encoded function data for the `disable` method of your validator contract. For example, in ECDSA validator, this method returns the abi encoded function data for the `disable` method with empty bytes param since ECDSA Validator doesn't require any param.
- `signMessage(message: Uint8Array | string | Hex)` -- this method should return the signature of the message using the connected signer.
- `signUserOp(userOp: UserOperationRequest)` -- this method should return the signature of the userOp hash using the connected signer.
