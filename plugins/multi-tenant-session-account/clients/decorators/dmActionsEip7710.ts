import type { SmartAccount } from "permissionless/accounts"
import type { EntryPoint } from "permissionless/types/entrypoint"
import type { Chain, Client, Hash, Transport } from "viem"
import {
    type SignDelegationParameters,
    signDelegation
} from "../../actions/index.js"

export type DMActionsEip7710<
    TEntryPoint extends EntryPoint,
    TAccount extends SmartAccount<TEntryPoint> | undefined =
        | SmartAccount<TEntryPoint>
        | undefined
> = {
    signDelegation: (
        args: SignDelegationParameters<TEntryPoint, TAccount>
    ) => Promise<Hash>
}

const dmActionsEip7710 =
    <
        TEntryPoint extends EntryPoint,
        TAccount extends SmartAccount<TEntryPoint> | undefined =
            | SmartAccount<TEntryPoint>
            | undefined
    >() =>
    <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined
    >(
        client: Client<TTransport, TChain, TAccount>
    ): DMActionsEip7710<TEntryPoint, TAccount> => ({
        signDelegation: (args) =>
            signDelegation(
                client as Client<TTransport, TChain, TAccount>,
                {
                    ...args
                } as SignDelegationParameters<TEntryPoint, TAccount>
            )
    })

export { dmActionsEip7710 }
