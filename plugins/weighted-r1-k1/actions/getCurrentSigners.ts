import {
    AccountNotFoundError,
    type KernelSmartAccountImplementation
} from "@zerodev/sdk"
import type { Chain, Client, Hex, Transport } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { readContract } from "viem/actions"
import { getAction, parseAccount } from "viem/utils"
import { WeightedValidatorAbi } from "../abi.js"
import { getValidatorAddress } from "../index.js"
import type { WeightedValidatorContractVersion } from "../toWeightedValidatorPlugin.js"

export type GetCurrentSignersReturnType = Array<{
    encodedPublicKey: Hex
    weight: number
}>

export async function getCurrentSigners<
    account extends SmartAccount | undefined,
    chain extends Chain | undefined
>(
    client: Client<Transport, chain, account>,
    {
        validatorContractVersion
    }: {
        validatorContractVersion: WeightedValidatorContractVersion
    }
): Promise<GetCurrentSignersReturnType> {
    const account_ = client.account
    if (!account_) throw new AccountNotFoundError()

    const account = parseAccount(
        account_
    ) as unknown as SmartAccount<KernelSmartAccountImplementation>

    const validatorAddress = getValidatorAddress(
        account.entryPoint.version,
        validatorContractVersion
    )
    if (!validatorAddress) {
        throw new Error("Validator address not found")
    }

    const weightedStorage = await getAction(
        client,
        readContract,
        "readContract"
    )({
        abi: WeightedValidatorAbi,
        address: validatorAddress,
        functionName: "weightedStorage",
        args: [account.address]
    })

    const guardiansLength = weightedStorage[3]

    const signers: Array<{ encodedPublicKey: Hex; weight: number }> = []
    for (let i = 0; i < guardiansLength; i++) {
        const guardian = await getAction(
            client,
            readContract,
            "readContract"
        )({
            abi: WeightedValidatorAbi,
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
