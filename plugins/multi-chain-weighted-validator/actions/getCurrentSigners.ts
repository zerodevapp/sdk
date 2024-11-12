import {
    AccountNotFoundError,
    type KernelSmartAccountImplementation
} from "@zerodev/sdk"
import type { Chain, Client, Hex, Transport } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { readContract } from "viem/actions"
import { getAction, parseAccount } from "viem/utils"
import { getValidatorAddress } from "../toMultiChainWeightedValidatorPlugin.js"
import { MultiChainWeightedValidatorAbi } from "../abi"

export async function getCurrentSigners<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined
>(
    client: Client<Transport, chain, account>
): Promise<Array<{ encodedPublicKey: Hex; weight: number }>> {
    const account_ = client.account
    if (!account_) throw new AccountNotFoundError()

    const account = parseAccount(
        account_
    ) as unknown as SmartAccount<KernelSmartAccountImplementation>

    const validatorAddress = getValidatorAddress(
        account.entryPoint,
        account.kernelVersion
    )

    const multiChainWeightedStorage = await getAction(
        client,
        readContract,
        "readContract"
    )({
        abi: MultiChainWeightedValidatorAbi,
        address: validatorAddress,
        functionName: "multiChainWeightedStorage",
        args: [account.address]
    })

    const guardiansLength = multiChainWeightedStorage[3]

    const signers: Array<{ encodedPublicKey: Hex; weight: number }> = []
    for (let i = 0; i < guardiansLength; i++) {
        const guardian = await getAction(
            client,
            readContract,
            "readContract"
        )({
            abi: MultiChainWeightedValidatorAbi,
            address: validatorAddress,
            functionName: "guardian",
            args: [BigInt(i), account.address]
        })
        signers.push({
            encodedPublicKey: guardian[2],
            weight: guardian[1]
        })
    }
    return signers
}
