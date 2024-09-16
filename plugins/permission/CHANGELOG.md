# @zerodev/permissions

## 5.4.6

### Patch Changes

- Patch for latest permissionless 0.1.45 support

## 5.4.5

### Patch Changes

- Pinned permissionless version >=0.1.18 <=0.1.29

## 5.4.4

### Patch Changes

- Added initConfig support in deserialize utils of permission validator and kernel account

## 5.4.3

### Patch Changes

- Fixed erc4337 storage violation with custom storage slot (Works with Alchemy now)

## 5.4.2

### Patch Changes

- Added v0.0.3 contract version for CallPolicy

## 5.4.1

### Patch Changes

- Added new contract version for WebAuthnSigner

## 5.4.0

### Patch Changes

- Added ONE_OF condition to the CallPolicy
- Added native ETH transfer support to the CallPolicy
- Added `zeroAddress` target address support, which means you can approve any contracts with specific selector. (e.g. approve any ERC20 transfer)

## 5.3.2

### Patch Changes

- Separated webauthn signer and webauthn key module

## 5.3.1

### Patch Changes

- Update viem to 2.16.3

## 5.3.0

### Minor Changes

- Kernel v3.1 released. And kernel versioning update. Added kernelVersion param in the interface.

## 5.3.0-alpha-0

### Minor Changes

- Integrated Kernel v3.1 and added kernelVersion param in account and plugins interface

## 5.2.10

### Patch Changes

- Decoupled creating passkey itself and the signer

## 5.2.2

### Patch Changes

- Update permissionless@0.1.18
