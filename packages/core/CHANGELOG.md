# @zerodev/sdk

## 5.5.5

### Patch Changes

- feat: added execType param support in Kernel Account encodeCalls function

## 5.5.4

### Patch Changes

- feat: export actions from root in core package

## 5.5.3

### Patch Changes

- fix: update migration helper contract address

## 5.5.2

### Patch Changes

- feat: modified migration kernel account to use migration helper contract

## 5.5.1

### Patch Changes

- feat: expose migration status function from migration util

## 5.5.0

### Minor Changes

- feat: security patch

## 5.4.42

### Patch Changes

- feat: migration account support

## 5.4.41

### Patch Changes

- Add support for pre-installed permission plugins via `isPreInstalled` parameter
- Fix nonce mode calculation for permission plugins installed via initConfig

## 5.4.40

### Patch Changes

- feat: support passing SmartAccount to toSigner util

## 5.4.39

### Patch Changes

- fix: fixed 7702 signMessage and signTypedData signature wrapper

## 5.4.38

### Patch Changes

- feat: added Kernelv3.3 abi

## 5.4.37

### Patch Changes

- fix: hexlify number explicitly in deepHexlify util

## 5.4.36

### Patch Changes

- feat: integrated 7702 features in core kernel account and client

## 5.4.35

### Patch Changes

- fix: args in uninstall userOp

## 5.4.34

### Patch Changes

- fix: toSigner skips walletClient creation when signer.account is present

## 5.4.33

### Patch Changes

- feat: optimised toSigner rpc call for address and memoized account metadata

## 5.4.32

### Patch Changes

- feat: added signAuthorization extension for walletClient in toSigner

## 5.4.31

### Patch Changes

- fix: return kernel nonce to 1 if it is 0 in getKernelV3Nonce util

## 5.4.30

### Patch Changes

- client action extends issue fixed

## 5.4.29

### Patch Changes

- updated to use latest viem 2.28.0 and support for 7702

## 5.4.28

### Patch Changes

- chore: update viem version

## 5.4.27

### Patch Changes

- feat: expose impl address

## 5.4.26

### Patch Changes

- fix: remove logs from 7702 flow

## 5.4.25

### Patch Changes

- feat: use publicClient transport url in sponsorWalletClient for 7702

## 5.4.24

### Patch Changes

- fix: update kernelv3.3beta contracts with eip191 support

## 5.4.23

### Patch Changes

- fix: remove `initialize` data from 7702 delegation tx call

## 5.4.22

### Patch Changes

- feat: automatic useMetaFactory detection

## 5.4.21

### Patch Changes

- fix: initialize data for eip7702

## 5.4.20

### Patch Changes

- feat: add Kernelv3.3 beta with proper eip7702 support

## 5.4.19

### Patch Changes

- feat: added getValidatorPluginInstallModuleData util

## 5.4.18

### Patch Changes

- feat: added validator plugin type support to pluginMigrations

## 5.4.17

### Patch Changes

- Fix: add .js imports in core pkg

## 5.4.16

### Patch Changes

- Decreased the `pollingInterval` to 1000ms

## 5.4.15

### Patch Changes

- Reduced pollingInterval to 1500ms for kernelClient

## 5.4.14

### Patch Changes

- Added getKernelVersion action

## 5.4.13

### Patch Changes

- Exported some utils for createEcdsaKernelMigrationAccount

## 5.4.12

### Patch Changes

- feat: remove "type" field

## 5.4.11

### Patch Changes

- Added 7702 alpha support

## 5.4.10

### Patch Changes

- feat: add pluginMigrations feature

## 5.4.9

### Patch Changes

- Change return type of getUpgradeKernelCall to UserOperationCall

## 5.4.8

### Patch Changes

- Added getUpgradeKernelCall util

## 5.4.7

### Patch Changes

- Added upgradeKernel (account) and getKernelImplementation (public) actions

## 5.4.6

### Patch Changes

- Integrated KernelV3.2 support

## 5.4.5

### Patch Changes

- Fix bug related to factoryAddress being metaFactory when useMetaFactory is false

## 5.4.4

### Patch Changes

- Use getUserOperationGasPrice middleware by default in kernelAccountClient

## 5.4.3

### Patch Changes

- fix: do not pass sudoValidator and hook to sendUserOperation in changeSudoValidator action

## 5.4.2

### Patch Changes

- feat: use publicClient instead of bundlerClient in getUserOperationGasPrice action for publicActions if available

## 5.4.1

### Patch Changes

- Use .js imports to fix build issues in all environments

## 5.4.0

### Minor Changes

- Migrate to using `viem@2.18.x` with native AA modules instead of `permissionless`

## 5.4.0-beta.0

### Minor Changes

- Migrate to using `viem@2.18.x` with native AA modules instead of `permissionless`

## 5.3.26

### Patch Changes

- Fixed uninstallPlugin which required transactions param

## 5.3.25

### Patch Changes

- Changed uninstallPlugin to use sendTransaction instead of sendTransaction so that execute can be used to call uninstallValidation

## 5.3.24

### Patch Changes

- Added CONDUIT provider to list of provider which can use getUserOperationGasPrice

## 5.3.23

### Patch Changes

- Added sponsorUserOperationEip7677 action to ZeroDevPaymasterClient

## 5.3.22

### Patch Changes

- Removed unnecessary logs in changeSudoValidator

## 5.3.21

### Patch Changes

- Added changeSudoValidator action to kernelAccountClient

## 5.3.20

### Patch Changes

- Added custom gasPrice logic for Alchemy and Conduit in getUserOperationGasPrice action

## 5.3.19

### Patch Changes

- Add support for CONDUIT as provider alongwith ZERODEV

## 5.3.18

### Patch Changes

- Added entrypoint v0.7 support for erc20 paymaster

## 5.3.17

### Patch Changes

- Fixed bundlerTransport timeout not applying issue

## 5.3.16

### Patch Changes

- Added support for THIRDWEB provider

## 5.3.15

### Patch Changes

- Added some util exports

## 5.3.14

### Patch Changes

- Patch for latest permissionless 0.1.45 support

## 5.3.13

### Patch Changes

- Optimized performance by removing unnecessary getChainId calls and caching pluginEnabled data

## 5.3.12

### Patch Changes

- Pinned permissionless version >=0.1.18 <=0.1.29

## 5.3.11

### Patch Changes

- Exposed regular validator properties in the kernelPluginManager interface

## 5.3.10

### Patch Changes

- Added initConfig support in deserialize utils of permission validator and kernel account

## 5.3.9

### Patch Changes

- Added useMetaFactory support in createKernelAccount
- Added `ZERODEV` provider support

## 5.3.8

### Patch Changes

- Added initConfig support in createKernelAccount

## 5.3.7

### Patch Changes

- Reverted viem version pin

## 5.3.6

### Patch Changes

- SDK core pinned to viem 2.16.x

## 5.3.5

### Patch Changes

- Added invalidateNonce and getKernelV3ModuleCurrentNonce actions in kernelAccountClient

## 5.3.4

### Patch Changes

- Simplified the process by making the `getChainId` call the only required action.

## 5.3.3

### Patch Changes

- Fixed sponsorUserOperation to return max fees values for Alchemy provider

## 5.3.2

### Patch Changes

- Update viem to 2.16.3

## 5.3.1

### Patch Changes

- Include constants as exports from SDK core.

## 5.3.0

### Minor Changes

- Kernel v3.1 released. And kernel versioning update. Added kernelVersion param in the interface.

## 5.3.0-alpha-0

### Minor Changes

- Integrated Kernel v3.1 and added kernelVersion param in account and plugins interface

## 5.2.19

### Patch Changes

- Added uninstallPlugin action to kernelAccountClient

## 5.2.18

### Patch Changes

- Added cache for enable signature

## 5.2.17

### Patch Changes

- Added hook plugin support

## 5.2.16

### Patch Changes

- Fixed fallbackKernelClient support for the extend function

## 5.2.15

### Patch Changes

- Added type export for multi chain client

## 5.2.14

### Patch Changes

- Added entrypoint v0.7 support in signUserOperation action

## 5.2.12

### Patch Changes

- Fixed Alchemy provider support for EntryPoint v0.7

## 5.2.10

### Patch Changes

- Fixed createKernelAccountClient return type issue

## 5.2.9

### Patch Changes

- Added fallbackKernelClient to support fallback providers

## 5.2.8

### Patch Changes

- Added default only entrypoint hook integration for custom action in kernel v3

## 5.2.7

### Patch Changes

- fix kernelAccountActions typing

## 5.2.6

### Patch Changes

- Fix typing in createKernelAccountClient

## 5.2.5

### Patch Changes

- Make getERC20PaymasterApproveCall take entryPoint as generic type

## 5.2.4

### Patch Changes

- Update permissionless@0.1.18 and return maxFeePerGas and maxPriorityFeePerGas in response from sponsorUserOperation action
