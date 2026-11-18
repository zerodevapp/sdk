---
"@zerodev/sdk": minor
---

Add `sendUserOperationSync`, which sends a user operation with `zd_sendUserOperationSync` and returns its receipt in the same call, falling back to polling when the bundler times out.
