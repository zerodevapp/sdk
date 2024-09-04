import type { SmartAccount } from "permissionless/accounts"
import type { EntryPoint } from "permissionless/types"
import type { Chain, Client, Hash, Transport } from "viem"
import {
    type EncodeCallDataWithCABParameters,
    type SignDelegationParameters,
    encodeCallDataWithCAB,
    signDelegation
} from "../../actions/index.js"

export type DMActionsEip7710<
    TEntryPoint extends EntryPoint,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends SmartAccount<TEntryPoint> | undefined =
        | SmartAccount<TEntryPoint>
        | undefined
> = {
    signDelegation: (
        args: SignDelegationParameters<TEntryPoint, TAccount>
    ) => Promise<Hash>
    encodeCallDataWithCAB: <TChainOverride extends Chain | undefined>(
        args: EncodeCallDataWithCABParameters<
            TEntryPoint,
            TChain,
            TAccount,
            TChainOverride
        >
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
    ): DMActionsEip7710<TEntryPoint, TChain, TAccount> => ({
        signDelegation: (args) =>
            signDelegation(
                client as Client<TTransport, TChain, TAccount>,
                {
                    ...args
                } as SignDelegationParameters<TEntryPoint, TAccount>
            ),
        encodeCallDataWithCAB: (args) =>
            encodeCallDataWithCAB(
                client as Client<TTransport, TChain, TAccount>,
                {
                    ...args
                } as EncodeCallDataWithCABParameters<
                    TEntryPoint,
                    TChain,
                    TAccount
                >
            )
    })

export { dmActionsEip7710 }
