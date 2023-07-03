# Zerodev Kernel Account API
This package contains ZeroDev's KernelV2 implementation of the `@alchemy/aa-core` [`BaseSmartContractAccount`](https://github.com/alchemyplatform/aa-sdk/blob/main/packages/core/src/account/base.ts) class defined in `@alchemy/aa-core`. 

[What is Kernel V2?](https://docs.zerodev.app/blog/kernel-v2-and-the-lessons-we-learned)
[Documentation](https://docs.zerodev.app/use-wallets/overview)

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
  type ValidatorMode 
} from "@zerodevapp/sdk@alpha";
import {PrivateKeySigner} from "@alchemy/aa-core";
import { polygonMumbai } from "viem/chains";

const KERNEL_ACCOUNT_FACTORY_ADDRESS =
  "0x5D006d3880645ec6e254E18C1F879DAC9Dd71A39";

// 1. define the EOA owner of the Smart Account
// This is just one exapmle of how to interact with EOAs, feel free to use any other interface
const owner = PrivateKeySigner.privateKeyToAccountSigner(PRIVATE_KEY);

// 2. Instantiate a Provider Builder
const providerBuilder = new ProviderBuilder();

// 3. Instantiate a Kernel Provider by passing in the Provider Builder instance
// Kernel Provider is a preset which initiate the Provider Builder with all the necessary configurations
// You can can build your own Provider builder with custom configurations if you want
// without using the kernel provider
const kernelProvider = new KernelProvider(providerBuilder);

// 4. Initiate the Kernel Provider
await kernelProvider.init({
    projectId, // zeroDev projectId
    owner,
});

// 5. Get the provider instance
const provider = await providerBuilder.buildProvider();


// 6. send a UserOperation
const { hash } = await provider.sendUserOperation({
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

Just pass the `paymasterConfig` to `kernelProvider` while initializing.

```ts
await kernelProvider.init({
    projectId, // zeroDev projectId
    owner,
    opts: {
        paymasterConfig: {
            policy: "TOKEN_PAYMASTER",
            gasToken: "TEST_ERC20"
        }
    }
});
```

### Change Kernel Account Owner in ECDSAValidator

```ts
// 1. Instantiate a Validator Provider Builder and Kernel Validator Provider
let validatorProviderBuilder = new ValidatorProviderBuilder();
let kernelValidatorProvider = new KernelValidatorProvider(validatorProviderBuilder);

// 2. Initiate the Kernel Validator Provider
await kernelValidatorProvider.init({
    projectId, // zeroDev projectId
    owner,
    // Optional: by default, the validator mode is set to "ECDSA"
    // validatorType: "ECDSA",
});

// 3. Get the validator provider instance
let ecdsaValidatorProvider = await validatorProviderBuilder.buildValidatorProvider();

// 4. Change the owner of the Kernel Account
const { hash } = await ecdsaValidatorProvider.changeOwner(<NEW_OWNER_ADDRESS>);
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

