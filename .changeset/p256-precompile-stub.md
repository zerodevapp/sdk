---
"@zerodev/passkey-validator": patch
"@zerodev/permissions": patch
"@zerodev/react-native-passkeys-utils": patch
"@zerodev/webauthn-key": patch
---

fix: WebAuthn stub signatures now set `usePrecompiled` like real signatures, so gas estimates use the P-256 precompile where the chain has it. A custom `signMessageCallback` can expose `usePrecompiled(chainId)` to set the stub's flag; without it the stub stays `false`. `signMessageWithReactNativePasskeys` exposes it and now uses the chain list from `@zerodev/webauthn-key`, so React Native signatures use the precompile on every chain in that list.
