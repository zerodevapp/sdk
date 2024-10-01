# @zerodev/sdk

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
