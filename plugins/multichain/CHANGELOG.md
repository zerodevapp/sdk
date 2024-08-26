# @zerodev/multi-chain-sdk

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
