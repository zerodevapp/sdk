import {
    MIGRATION_HELPER_ADDRESS,
    MigrationHelperAbi
} from "@zerodev/sdk/accounts"
import type {
    Address,
    Chain,
    Client,
    Hex,
    JsonRpcAccount,
    LocalAccount,
    Transport
} from "viem"
import { readContract } from "viem/actions"
import { getAction } from "viem/utils"

export const isPermissionMigrated = async (
    client: Client<
        Transport,
        Chain | undefined,
        JsonRpcAccount | LocalAccount | undefined
    >,
    params: { account: Address; permissionId: Hex }
): Promise<boolean> => {
    try {
        const [, , p] = await getAction(
            client,
            readContract,
            "readContract"
        )({
            address: MIGRATION_HELPER_ADDRESS,
            abi: MigrationHelperAbi,
            functionName: "isMigrated",
            args: [params.account, [], [params.permissionId]]
        })
        return p[0]
    } catch {
        return false
    }
}
