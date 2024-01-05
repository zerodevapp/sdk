import type { Client } from "viem"
import {
    type SponsorUserOperationParameters,
    type SponsorUserOperationReturnType,
    sponsorUserOperation
} from "../../actions/kernel/sponsorUserOperation"
import type { ZeroDevPaymasterClient } from "../kernel"

export type ZeroDevPaymasterClientActions = {
    /**
     * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
     */
    sponsorUserOperation: (
        args: SponsorUserOperationParameters
    ) => Promise<SponsorUserOperationReturnType>
}

export const zerodevPaymasterActions = (
    client: Client
): ZeroDevPaymasterClientActions => ({
    sponsorUserOperation: async (args: SponsorUserOperationParameters) =>
        sponsorUserOperation(client as ZeroDevPaymasterClient, args)
})
