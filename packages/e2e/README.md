# @zerodev/e2e

Local end-to-end suite: anvil forks of Sepolia and Arbitrum Sepolia, our Ultra Relay bundler, and a small gateway that mimics meta-aa-provider's Ultra Relay path. The network suite in `packages/test` is unchanged and still runs against real testnets.

## Run locally

```bash
cp .env.example .env          # archive-capable SEPOLIA_RPC_URL and ARB_SEPOLIA_RPC_URL
(cd ../.. && bun install && bun run build)
bun run local:up              # first run builds Ultra Relay from git (several minutes)
bun run test                  # or: bun test --timeout 30000 --preload ./harness/preflight.ts tests/plugins/permission
bun run test:gateway          # gateway unit tests, no stack needed
bun run local:down
```

The fork RPCs must serve archive state: anvil forks at the block pinned in `docker/stack.env`, which soon falls outside a full node's window. Infura and Alchemy work; public endpoints usually do not.

## Layout

- `docker/`: compose stack, gateway, Ultra Relay configs, pins (`stack.env`)
- `harness/`: clients, account factories, anvil helpers, signature checks
- `tests/core/conformance.ts`: `runCoreFlows(makeAccount)`, run by every validator package
- `tests/core/`: core-only tests (accounts, actions, clients, 7702)
- `tests/plugins/<package>/`: one folder per SDK plugin

Adding a validator plugin: create `tests/plugins/<name>/conformance.test.ts` calling `runCoreFlows` with your account factory, then add plugin-specific tests beside it.

## Gateway

`docker/gateway.ts` serves `/api/v3/<project>/chain/<chainId>`, like `rpc.zerodev.app`:

- `zd_getUserOperationGasPrice`: zero fees (sponsored). With project id `unsponsored` it returns Ultra Relay's real fees, like a project without gas policies.
- `zd_sponsorUserOperation`, `pm_getPaymasterStubData`, `pm_getPaymasterData`: forwarded to Ultra Relay as `eth_estimateUserOperationGas`.
- Other ERC-4337 methods go to Ultra Relay unchanged; every other method (`eth_call`, `eth_getCode`, …) goes to the chain's anvil node, like meta-aa-provider's `isERC4337RpcMethod` routing.

## Known bugs and findings

Known bugs are tested as their **current behaviour**: each test asserts exactly what happens today (with a control showing the setup works), so it cannot pass for an unrelated reason and it breaks loudly once the bug is fixed. The fix PR then inverts the assertion; never delete the test. Test names start with the Linear ID, so `bun test -t "ZER-1087"` selects one.

| Ticket | Behaviour | Test |
|---|---|---|
| ZER-1087 | Via `sponsorUserOperation`, `upgradeKernel` / `invalidateNonce` are rejected for the leaked `kernelVersion` / `nonceToSet` key (the ERC-7677 paymaster wiring works) | `tests/core/actions/upgradeKernel.test.ts`, `admin.test.ts` |
| ZER-1088 | `changeSudoValidator` to the already-installed ECDSA validator with a new owner keeps the old owner (Kernel skips re-install; the SDK reports success) | `tests/core/actions/admin.test.ts` |
| ZER-1089 | Kernel 0.3.0: switching root to a permission validator reports success, but the new key cannot sign and the old owner still can | `tests/core/actions/admin.test.ts` |
| ZER-1090 | Kernel 0.3.0: `encodeDeployCallData` with estimated gas deploys nothing (the failed delegatecall is swallowed, so estimation under-sizes call gas); an explicit `callGasLimit` works | `tests/core/actions/send.test.ts` |
| ZER-1092 (ZDS-11) | Replayable signature from an account deployed on one chain does not verify where it is not deployed | `tests/core/conformance.ts` |
| ZER-1093 (ZDS-12) | `kernelClient.signMessage` drops `useReplayableSignature` | `tests/core/clients/kernelAccountClient.test.ts` |
| ZER-1094 (ZDS-13) | `useReplayableSignature` yields an invalid signature on Kernel <0.3.2 | `tests/core/conformance.ts` |

SUP-1431 (gas-policy estimation) does not reproduce locally: anvil caps `eth_call` gas at the block gas limit, so Ultra Relay's estimation probe stays far below the budget.

## Pins and accounts

`docker/stack.env` pins the Ultra Relay commit, the fork block per chain, and the anvil mnemonic. Bumping a pin is a one-line PR; a new fork block also resets the CI anvil cache.

anvil runs with its own mnemonic because its default dev keys are public and carry EIP-7702 sweeper delegations on the real testnets, which a fork inherits. If a fork-block bump starts failing bundles with `filterOps` panics, check `cast code <executor>` and regenerate the mnemonic.
