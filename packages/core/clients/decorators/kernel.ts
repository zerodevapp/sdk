import {
    SponsorUserOperationParameters,
    SponsorUserOperationReturnType,
    sponsorUserOperation
} from "@zerodev/core/actions/kernel/sponsorUserOperation"
import { Client } from "viem"
import { KernelPaymasterClient } from "../kernel"

export type KernelPaymasterClientActions = {
    /**
     * Returns paymasterAndData & updated gas parameters required to sponsor a userOperation.
     *
     *
     * @param args {@link SponsorUserOperationParameters} UserOperation you want to sponsor & entryPoint.
     * @returns paymasterAndData & updated gas parameters, see {@link SponsorUserOperationReturnType}
     *
     * @example
     * import { createClient } from "viem"
     * import { sponsorUserOperation } from "permissionless/actions/pimlico"
     *
     * const bundlerClient = createClient({
     *      chain: goerli,
     *      transport: http("https://api.pimlico.io/v2/goerli/rpc?apikey=YOUR_API_KEY_HERE")
     * }).extend(pimlicoPaymasterActions)
     *
     * await bundlerClient.sponsorUserOperation(bundlerClient, {
     *      userOperation: userOperationWithDummySignature,
     *      entryPoint: entryPoint
     * }})
     *
     */
    sponsorUserOperation: (
        args: SponsorUserOperationParameters
    ) => Promise<SponsorUserOperationReturnType>
}

export const kernelPaymasterActions = (
    client: Client
): KernelPaymasterClientActions => ({
    sponsorUserOperation: async (args: SponsorUserOperationParameters) =>
        sponsorUserOperation(client as KernelPaymasterClient, args)
})
