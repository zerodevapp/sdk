import { describe, expect, test } from "bun:test"
import {
    type Address,
    hashMessage,
    hashTypedData,
    parseEther,
    zeroAddress
} from "viem"
import { entryPoint07Abi } from "viem/account-abstraction"
import type { PrivateKeyAccount } from "viem/accounts"
import {
    ENTRY_POINT,
    KERNEL_V3_VERSIONS,
    type KernelV3Version,
    newOwner,
    randomIndex,
    supportsReplayable
} from "../../harness/accounts"
import { setBalance } from "../../harness/anvil"
import {
    type KernelAccount,
    getKernelClient,
    getPublicClient
} from "../../harness/clients"
import { ALL_CHAINS, type ChainKey } from "../../harness/env"
import { forEachKernelVersion } from "../../harness/matrix"
import { userOpSucceeded } from "../../harness/receipts"
import { isDeployed, isValid1271, isValid6492 } from "../../harness/verify"

export type MakeAccount = (args: {
    chain: ChainKey
    kernelVersion: KernelV3Version
    owner: PrivateKeyAccount
    index: bigint
}) => Promise<KernelAccount>

const MESSAGE = "zerodev e2e"

const TYPED_DATA = {
    domain: { name: "E2E", version: "1", chainId: 1 },
    types: { Mail: [{ name: "contents", type: "string" }] },
    primaryType: "Mail",
    message: { contents: "hello" }
} as const

const noopCall = { to: zeroAddress, value: 0n, data: "0x" } as const

async function deploy(account: KernelAccount, chain: ChainKey) {
    const client = getKernelClient(account, chain)
    const hash = await client.sendUserOperation({ calls: [noopCall] })
    const receipt = await client.waitForUserOperationReceipt({ hash })
    expect(receipt.success).toBeTrue()
}

export function runCoreFlows({
    name,
    makeAccount,
    versions = KERNEL_V3_VERSIONS,
    chains = ["sepolia"],
    signatures = true
}: {
    name: string
    makeAccount: MakeAccount
    versions?: readonly KernelV3Version[]
    // Chains the full per-chain flows run on. Cross-chain checks always use
    // every chain, and any chain left out here still gets a smoke test.
    chains?: readonly ChainKey[]
    signatures?: boolean
}) {
    const fresh = (chain: ChainKey, kernelVersion: KernelV3Version) =>
        makeAccount({
            chain,
            kernelVersion,
            owner: newOwner(),
            index: randomIndex()
        })

    describe(`${name}: core flows`, () => {
        forEachKernelVersion(versions, (kernelVersion) => {
            test("counterfactual address is identical on every chain", async () => {
                const owner = newOwner()
                const index = randomIndex()
                const addresses = await Promise.all(
                    ALL_CHAINS.map(
                        async (chain) =>
                            (
                                await makeAccount({
                                    chain,
                                    kernelVersion,
                                    owner,
                                    index
                                })
                            ).address
                    )
                )
                expect(new Set(addresses).size).toBe(1)
            })

            for (const chain of chains) {
                describe(chain, () => {
                    test("first userOp deploys the account", async () => {
                        const account = await fresh(chain, kernelVersion)
                        expect(
                            await isDeployed(chain, account.address)
                        ).toBeFalse()
                        await deploy(account, chain)
                        expect(
                            await isDeployed(chain, account.address)
                        ).toBeTrue()
                    })

                    // Funded so each call moves 1 wei: the effect proves the
                    // calls ran with the requested target and value.
                    const funded = async () => {
                        const account = await fresh(chain, kernelVersion)
                        await setBalance(
                            chain,
                            account.address,
                            parseEther("1")
                        )
                        return account
                    }
                    const balanceOf = (address: Address) =>
                        getPublicClient(chain).getBalance({ address })

                    test("sendTransaction with a single call", async () => {
                        const account = await funded()
                        const to = newOwner().address
                        const client = getKernelClient(account, chain)
                        const txHash = await client.sendTransaction({
                            to,
                            value: 1n,
                            data: "0x"
                        })
                        expect(
                            await userOpSucceeded(
                                chain,
                                txHash,
                                account.address
                            )
                        ).toBeTrue()
                        expect(await balanceOf(to)).toBe(1n)
                    })

                    test("sendUserOperation with a batch", async () => {
                        const account = await funded()
                        const [a, b] = [newOwner().address, newOwner().address]
                        const client = getKernelClient(account, chain)
                        const hash = await client.sendUserOperation({
                            calls: [
                                { to: a, value: 1n, data: "0x" },
                                { to: b, value: 2n, data: "0x" }
                            ]
                        })
                        const receipt =
                            await client.waitForUserOperationReceipt({
                                hash
                            })
                        expect(receipt.success).toBeTrue()
                        expect(await balanceOf(a)).toBe(1n)
                        expect(await balanceOf(b)).toBe(2n)
                    })

                    test("writeContract", async () => {
                        const account = await funded()
                        const client = getKernelClient(account, chain)
                        const txHash = await client.writeContract({
                            address: ENTRY_POINT.address,
                            abi: entryPoint07Abi,
                            functionName: "depositTo",
                            args: [account.address],
                            value: 1n
                        })
                        expect(
                            await userOpSucceeded(
                                chain,
                                txHash,
                                account.address
                            )
                        ).toBeTrue()
                        const deposit = await getPublicClient(
                            chain
                        ).readContract({
                            address: ENTRY_POINT.address,
                            abi: entryPoint07Abi,
                            functionName: "balanceOf",
                            args: [account.address]
                        })
                        expect(deposit).toBe(1n)
                    })

                    if (signatures) {
                        test("signMessage verifies via ERC-6492 before deployment", async () => {
                            const account = await fresh(chain, kernelVersion)
                            const signature = await account.signMessage({
                                message: MESSAGE
                            })
                            expect(
                                await isValid6492(
                                    chain,
                                    account.address,
                                    hashMessage(MESSAGE),
                                    signature
                                )
                            ).toBeTrue()
                        })

                        test("signTypedData verifies via ERC-6492 before deployment", async () => {
                            const account = await fresh(chain, kernelVersion)
                            const signature =
                                await account.signTypedData(TYPED_DATA)
                            expect(
                                await isValid6492(
                                    chain,
                                    account.address,
                                    hashTypedData(TYPED_DATA),
                                    signature
                                )
                            ).toBeTrue()
                        })

                        test("signTypedData verifies via ERC-1271 after deployment", async () => {
                            const account = await fresh(chain, kernelVersion)
                            await deploy(account, chain)
                            const signature =
                                await account.signTypedData(TYPED_DATA)
                            expect(
                                await isValid1271(
                                    chain,
                                    account.address,
                                    hashTypedData(TYPED_DATA),
                                    signature
                                )
                            ).toBeTrue()
                        })

                        test("signMessage verifies via ERC-1271 after deployment", async () => {
                            const account = await fresh(chain, kernelVersion)
                            await deploy(account, chain)
                            const signature = await account.signMessage({
                                message: MESSAGE
                            })
                            expect(
                                await isValid1271(
                                    chain,
                                    account.address,
                                    hashMessage(MESSAGE),
                                    signature
                                )
                            ).toBeTrue()
                        })
                    }
                })
            }

            for (const chain of ALL_CHAINS.filter((c) => !chains.includes(c))) {
                // Catches a missing deployment or factory approval on the
                // other fork without repeating every flow there.
                test(`${chain} smoke: first userOp deploys and ${signatures ? "the account signs (ERC-1271)" : "sends"}`, async () => {
                    const account = await fresh(chain, kernelVersion)
                    await deploy(account, chain)
                    expect(await isDeployed(chain, account.address)).toBeTrue()
                    if (signatures) {
                        expect(
                            await isValid1271(
                                chain,
                                account.address,
                                hashMessage(MESSAGE),
                                await account.signMessage({ message: MESSAGE })
                            )
                        ).toBeTrue()
                    }
                })
            }

            if (signatures) {
                const [home, away] = ALL_CHAINS

                if (supportsReplayable(kernelVersion)) {
                    test("replayable signature from an undeployed account verifies on another chain", async () => {
                        const account = await fresh(home, kernelVersion)
                        const signature = await account.signMessage({
                            message: MESSAGE,
                            useReplayableSignature: true
                        })
                        expect(
                            await isValid6492(
                                away,
                                account.address,
                                hashMessage(MESSAGE),
                                signature
                            )
                        ).toBeTrue()
                    })

                    // Known bug, asserted as current behaviour so the test
                    // breaks loudly once SUP-1497 is fixed (then invert it).
                    test("SUP-1497 (current behaviour): replayable signature from an account deployed on one chain does not verify where it is not deployed", async () => {
                        const account = await fresh(home, kernelVersion)
                        await deploy(account, home)
                        const signature = await account.signMessage({
                            message: MESSAGE,
                            useReplayableSignature: true
                        })
                        const hash = hashMessage(MESSAGE)
                        // Control: the signature itself is good on the home chain.
                        expect(
                            await isValid1271(
                                home,
                                account.address,
                                hash,
                                signature
                            )
                        ).toBeTrue()
                        // Bug: no ERC-6492 wrapping, so the undeployed chain rejects it.
                        expect(
                            await isValid6492(
                                away,
                                account.address,
                                hash,
                                signature
                            )
                        ).toBeFalse()
                    })
                } else {
                    test("SUP-1499 (current behaviour): useReplayableSignature yields an invalid signature on kernel <0.3.2", async () => {
                        const account = await fresh(home, kernelVersion)
                        await deploy(account, home)
                        const hash = hashMessage(MESSAGE)
                        // Control: a normal signature from the same account is valid.
                        expect(
                            await isValid1271(
                                home,
                                account.address,
                                hash,
                                await account.signMessage({ message: MESSAGE })
                            )
                        ).toBeTrue()
                        // Bug: the flag is not ignored, the chainId-0 digest is wrong.
                        expect(
                            await isValid1271(
                                home,
                                account.address,
                                hash,
                                await account.signMessage({
                                    message: MESSAGE,
                                    useReplayableSignature: true
                                })
                            )
                        ).toBeFalse()
                    })
                }
            }
        })
    })
}
