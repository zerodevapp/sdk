import type { Address, Hex } from "viem"
import type { KernelEip8130BaseClient } from "../types.js"
import {
    type AaAccountChange,
    type AaCall,
    encodeWalletCalls,
    estimateGas as estimateEip8130Gas
} from "../vendor/eip8130/index.js"

export type EstimateGasParameters = (
    | {
          /** Priced as one phase. */
          calls: readonly AaCall[]
          to?: undefined
          data?: undefined
          value?: undefined
      }
    | {
          /** Single call, in viem's `estimateGas` shape. */
          to: Address
          data?: Hex
          value?: bigint
          calls?: undefined
      }
) & {
    accountChanges?: readonly AaAccountChange[]
    /** Sponsoring payer, when already known; priced into the estimate. */
    payer?: Address
}

/**
 * Prices the calls as one EIP-8130 phase from this Kernel, with the actor's
 * authenticator so auth gas matches the real signature shape.
 */
export async function estimateGas(
    client: KernelEip8130BaseClient,
    args: EstimateGasParameters
): Promise<bigint> {
    const account = client.eip8130Account
    const calls = args.calls ?? [
        { to: args.to as Address, data: args.data, value: args.value }
    ]
    return estimateEip8130Gas(client, {
        sender: account.address,
        calls: encodeWalletCalls({
            account: account.address,
            calls: [calls],
            encodeExecute: account.encodeExecute
        }),
        senderAuthAuthenticator: account.actor.authenticator,
        senderActorId: account.actorId,
        accountChanges: args.accountChanges,
        payer: args.payer
    })
}
