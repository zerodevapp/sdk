import { describe, expect, test } from "bun:test"
import { hashMessage, hashTypedData, zeroAddress } from "viem"
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
import { type KernelAccount, getKernelClient } from "../../harness/clients"
import { ALL_CHAINS, type ChainKey } from "../../harness/env"
import { forEachKernelVersion } from "../../harness/matrix"
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
    chains = ALL_CHAINS,
    signatures = true
}: {
    name: string
    makeAccount: MakeAccount
    versions?: readonly KernelV3Version[]
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
                    chains.map(
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

                    test("sendTransaction with a single call", async () => {
                        const account = await fresh(chain, kernelVersion)
                        const client = getKernelClient(account, chain)
                        const txHash = await client.sendTransaction(noopCall)
                        expect(txHash).toMatch(/^0x[0-9a-f]{64}$/)
                    })

                    test("sendUserOperation with a batch", async () => {
                        const account = await fresh(chain, kernelVersion)
                        const client = getKernelClient(account, chain)
                        const hash = await client.sendUserOperation({
                            calls: [
                                noopCall,
                                { ...noopCall, to: account.address }
                            ]
                        })
                        const receipt =
                            await client.waitForUserOperationReceipt({
                                hash
                            })
                        expect(receipt.success).toBeTrue()
                    })

                    test("writeContract", async () => {
                        const account = await fresh(chain, kernelVersion)
                        const client = getKernelClient(account, chain)
                        const txHash = await client.writeContract({
                            address: ENTRY_POINT.address,
                            abi: entryPoint07Abi,
                            functionName: "depositTo",
                            args: [account.address],
                            value: 0n
                        })
                        expect(txHash).toMatch(/^0x[0-9a-f]{64}$/)
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

            if (signatures && chains.length > 1) {
                const [home, away] = chains

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

                    test.failing(
                        "SUP-1497: replayable signature from an account deployed on one chain verifies where it is not deployed",
                        async () => {
                            const account = await fresh(home, kernelVersion)
                            await deploy(account, home)
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
                        }
                    )
                } else {
                    test.failing(
                        "SUP-1499: useReplayableSignature is ignored on kernel <0.3.2",
                        async () => {
                            const account = await fresh(home, kernelVersion)
                            await deploy(account, home)
                            const signature = await account.signMessage({
                                message: MESSAGE,
                                useReplayableSignature: true
                            })
                            expect(
                                await isValid1271(
                                    home,
                                    account.address,
                                    hashMessage(MESSAGE),
                                    signature
                                )
                            ).toBeTrue()
                        }
                    )
                }
            }
        })
    })
}
