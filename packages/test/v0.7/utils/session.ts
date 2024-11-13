import { privateKeyToAccount } from "viem/accounts"
import { getEntryPoint, getPublicClient } from "./common"
import { createSessionAccount, type Delegation } from "@zerodev/session-account"
import type { Hex } from "viem"

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
