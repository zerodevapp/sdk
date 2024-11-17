import { type Delegation, createSessionAccount } from "@zerodev/session-account"
import type { Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { getEntryPoint, getPublicClient } from "./common"

export const getSessionAccount = async (
    delegations: Delegation[],
    privateKey: Hex,
    delegatorInitCode?: Hex
) => {
    const sessionKeySigner = privateKeyToAccount(privateKey)
    const publicClient = await getPublicClient()

    return createSessionAccount(publicClient, {
        entryPoint: getEntryPoint(),
        sessionKeySigner,
        delegations,
        delegatorInitCode
    })
}
