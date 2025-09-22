# @zerodev/permissions

## 5.6.0

### Minor Changes

- feat: security patch

## 5.5.14

### Patch Changes

- fix: export WEBAUTHN_SIGNER_CONTRACT_V0_0_3 config

## 5.5.13

### Patch Changes

- fix: Release v0.0.3 of WebAuthnSigner contract to fix limitation of single WebAuthn signer with same account issue (check storage by account-id instead of just account)

## 5.5.12

### Patch Changes

- Add support for serializing accounts with permission plugins installed via initConfig
- Fix serialization failure when permission plugin not in kernelPluginManager
- Add optional `permissionPlugin` parameter to serializePermissionAccount

## 5.5.11

### Patch Changes

- fix(permission): critical security fixes for call policy validation
  - Pass selector to getPermissionFromABI for correct overload resolution
  - Fix crash when function not found in ABI
  - Normalize selectors to lowercase for consistent comparisons
  - Clean up types.ts documentation

## 5.5.10

### Patch Changes

- feat: export toInitConfig from permissions

## 5.5.9

### Patch Changes

- feat: added toInitConfig util in permissions plugin

## 5.5.8

### Patch Changes

- feat: added eip7702 flow support in serialization and deserialization utils

## 5.5.7

### Patch Changes

- fix: semver in permissions

## 5.5.6

### Patch Changes

- fix: encode initConfig with ^0.3.2 kernel version

## 5.5.5

### Patch Changes

- updated to use latest viem 2.28.0 and support for 7702

## 5.5.4

### Patch Changes

- chore: update viem version

## 5.5.3

### Patch Changes

- add optional rate limit policy for non-4337 opcode rule compliant way

## 5.5.2

### Patch Changes

- fix: multiChainWebAuthnValidator enable sig issue

## 5.5.1

### Patch Changes

- feat: remove "type" field

## 5.5.0

### Minor Changes

- Migrate to using `viem@2.18.x` with native AA modules instead of `permissionless`

## 5.5.0-beta.0

### Minor Changes

- Migrate to using `viem@2.18.x` with native AA modules instead of `permissionless`

## 5.4.10

### Patch Changes

- Allowed to pass enableSignature param in serializePermissionAccount util

## 5.4.9

### Patch Changes

- Export decodeParamsFromInitCode util from permission package

## 5.4.8

### Patch Changes

- Fixed the deserializePermissionAccount util when useMetaFactory is false

## 5.4.7

### Patch Changes

- Added optional param signerContractAddress in toEmptyECDSASigner in permissions pkg

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
