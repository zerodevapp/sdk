# @zerodev/passkey-validator

## 5.5.5

### Patch Changes

- chore: passkey support kernel ^0.3.2

## 5.5.4

### Patch Changes

- updated to use latest viem 2.28.0 and support for 7702

## 5.5.3

### Patch Changes

- chore: update viem version

## 5.5.2

### Patch Changes

- feat: add custom signing method support

## 5.5.1

### Patch Changes

- feat: remove "type" field

## 5.5.0

### Minor Changes

- Migrate to using `viem@2.18.x` with native AA modules instead of `permissionless`

## 5.5.0-beta.0

### Minor Changes

- Migrate to using `viem@2.18.x` with native AA modules instead of `permissionless`

## 5.4.2

### Patch Changes

- Patch for latest permissionless 0.1.45 support

## 5.4.1

### Patch Changes

- Pinned permissionless version >=0.1.18 <=0.1.29

## 5.4.0

### Minor Changes

- Added new contract version for PasskeyValidator

## 5.3.5

### Patch Changes

- Separated webauthn validator and webauthn key module

## 5.3.4

### Patch Changes

- Update clientDataJSON value of dummy signature. Refer this [docs](https://chromium.googlesource.com/chromium/src/+/master/content/browser/webauth/client_data_json.md) for more info.

## 5.3.3

### Patch Changes

- Update viem to 2.16.3

## 5.3.2

### Patch Changes

- Removed redundant calls to passkey-server during message signing

## 5.3.1

### Patch Changes

- Update serialization to account for userId

## 5.3.0

### Minor Changes

- Kernel v3.1 released. And kernel versioning update. Added kernelVersion param in the interface.

## 5.3.0-alpha-0

### Minor Changes

- Integrated Kernel v3.1 and added kernelVersion param in account and plugins interface

## 5.2.8

### Patch Changes

- Decoupled creating passkey itself and creating the validator

## 5.2.5

### Patch Changes

- Remove usePrecompiled from enable data

## 5.2.4

### Patch Changes

- Fix Entrypoint version in getPasskeyValidator

## 5.2.3

### Patch Changes

- Update permissionless@0.1.18
