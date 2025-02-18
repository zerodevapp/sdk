# @zerodev/multi-chain-web-auth

## 5.4.6

### Patch Changes

- fix: signTypedData with multichain webAuthnValidator

## 5.4.5

### Patch Changes

- feat: add custom signing method support

## 5.4.4

### Patch Changes

- feat: remove "type" field

## 5.4.3

### Minor Changes

- Change `sendUserOpeations` to `prepareAndSignUserOperations`

## 5.4.2

### Minor Changes

- Add `sendUserOpeations` method

## 5.4.1

### Minor Changes

- Export `toMultiChainWebAuthnValidator` properly

## 5.4.0

### Minor Changes

- Migrate to using `viem@2.18.x` with native AA modules instead of `permissionless`

## 5.3.12

### Patch Changes

- Fix bundlerTransport timeout issue

## 5.3.11

### Patch Changes

- Patch for latest permissionless 0.1.45 support

## 5.3.10

### Patch Changes

- Pinned permissionless version >=0.1.18 <=0.1.29

## 5.3.9

### Patch Changes

- Added custom rpId support to the multi chain webAuthn validator

## 5.3.8

### Patch Changes

- Fixed webAuthnSignUserOps to correctly encode signature

## 5.3.7

### Patch Changes

- Encode signature differently depending on number of user ops

## 5.3.6

### Patch Changes

- Fixed signature encoding issue of single user op for multi chain webauthn validator

## 5.3.5

### Patch Changes

- Allow passing custom middleware to the multi chain client prepareMultiUserOpRequest

## 5.3.4

### Minor Changes

- Add serializaztion for the MultiChainWebAuthnValidator

## 5.3.3

### Patch Changes

- Separated webauthn validator and webauthn key module

## 5.3.2

### Patch Changes

- Removed redundant calls to passkey-server during message signing

## 5.3.1

### Patch Changes

- Update viem to 2.16.3

## 5.3.0

### Minor Changes

- Kernel v3.1 released. And kernel versioning update. Added kernelVersion param in the interface.

## 5.3.0-alpha-0

### Minor Changes

- Integrated Kernel v3.1 and added kernelVersion param in account and plugins interface

## 5.2.2

### Patch Changes

- Added multi chain validator client

## 5.2.0

### Patch Changes

- add multi-chain validator sdk integration
