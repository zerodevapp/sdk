import { describe, expect, test } from "bun:test"
import {
    getValidatorAddress,
    signerToEcdsaValidator
} from "@zerodev/ecdsa-validator"
import { createKernelAccount } from "@zerodev/sdk"
import { hashMessage, zeroAddress } from "viem"
import { getEip712Domain } from "viem/actions"
import {
    ENTRY_POINT,
    KERNEL_V3_VERSIONS,
    createEcdsaAccount
} from "../../../harness/accounts"
import { getKernelClient, getPublicClient } from "../../../harness/clients"
import { isValid1271 } from "../../../harness/verify"

const call = { to: zeroAddress, value: 0n, data: "0x" } as const

const pairs = KERNEL_V3_VERSIONS.flatMap((from, i) =>
    KERNEL_V3_VERSIONS.slice(i + 1).map((to) => [from, to] as const)
)

// upgradeKernel spreads its args, so `kernelVersion` rides along on the op.
// The ERC-7677 wiring serializes the op with viem's formatUserOperationRequest
// (known fields only), so it works. The sponsorUserOperation wiring sends the
// raw op to zd_sponsorUserOperation, which forwards it unchanged, and strict
// bundler/paymaster schemas reject the extra key (same in production).
const wirings = [
    { paymaster: "erc7677", run: test, bug: "" },
    {
        paymaster: "sponsor",
        run: test.failing,
        bug: "NEW BUG (sponsorUserOperation forwards the raw op incl. kernelVersion): "
    }
] as const

describe("upgradeKernel", () => {
    for (const [from, to] of pairs) {
        for (const { paymaster, run, bug } of wirings) {
            run(
                `${bug}${from} → ${to} via ${paymaster} paymaster: account keeps working on the new implementation`,
                async () => {
                    const publicClient = getPublicClient("sepolia")
                    const { account, owner } = await createEcdsaAccount({
                        chain: "sepolia",
                        kernelVersion: from
                    })
                    const client = getKernelClient(account, "sepolia", {
                        paymaster
                    })
                    await client.waitForUserOperationReceipt({
                        hash: await client.sendUserOperation({ calls: [call] })
                    })

                    const hash = await client.upgradeKernel({
                        kernelVersion: to
                    })
                    expect(
                        (await client.waitForUserOperationReceipt({ hash }))
                            .success
                    ).toBeTrue()

                    const { domain } = await getEip712Domain(publicClient, {
                        address: account.address
                    })
                    expect(domain.version).toBe(to)

                    // The installed sudo validator is still the one from the
                    // original version (0.3.0 uses a different ECDSA validator).
                    const sudo = await signerToEcdsaValidator(publicClient, {
                        signer: owner,
                        entryPoint: ENTRY_POINT,
                        kernelVersion: to,
                        validatorAddress: getValidatorAddress(ENTRY_POINT, from)
                    })
                    const upgraded = await createKernelAccount(publicClient, {
                        entryPoint: ENTRY_POINT,
                        kernelVersion: to,
                        address: account.address,
                        plugins: { sudo }
                    })
                    const upgradedClient = getKernelClient(
                        upgraded,
                        "sepolia",
                        {
                            paymaster
                        }
                    )
                    expect(
                        (
                            await upgradedClient.waitForUserOperationReceipt({
                                hash: await upgradedClient.sendUserOperation({
                                    calls: [call]
                                })
                            })
                        ).success
                    ).toBeTrue()

                    const message = "upgraded"
                    const signature = await upgraded.signMessage({ message })
                    expect(
                        await isValid1271(
                            "sepolia",
                            account.address,
                            hashMessage(message),
                            signature
                        )
                    ).toBeTrue()
                }
            )
        }
    }
})
