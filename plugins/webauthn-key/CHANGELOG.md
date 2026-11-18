# @zerodev/passkey-validator

## 5.5.1

### Patch Changes

- 457af26e0f3b2c69b240aa06f643ec1c0d7c7255: fix: WebAuthn stub signatures now set `usePrecompiled` like real signatures, so gas estimates use the P-256 precompile where the chain has it. A custom `signMessageCallback` can expose `usePrecompiled(chainId)` to set the stub's flag; without it the stub stays `false`. `signMessageWithReactNativePasskeys` exposes it and now uses the chain list from `@zerodev/webauthn-key`, so React Native signatures use the precompile on every chain in that list.

## 5.5.0

### Minor Changes

- updated chain list for precompile

## 5.4.4

### Patch Changes

- updated to use latest viem 2.28.0 and support for 7702

## 5.4.3

### Patch Changes

- chore: update viem version

## 5.4.1

### Patch Changes

- feat: remove "type" field

## 5.4.0

### Minor Changes

- Migrate to using `viem@2.18.x` with native AA modules instead of `permissionless`

## 5.4.0-beta.0

### Minor Changes

- Update for `viem@2.18.x`

## 5.3.3

### Patch Changes

- Patch for latest permissionless 0.1.45 support

## 5.3.2

### Patch Changes

- Added custome rpId param

## 5.3.1

### Patch Changes

- Made passkeys server headers more flexible

## 5.3.0

### Patch Changes

- Add `toWebAuthnKey` function
