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
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends
        | SmartAccount<TEntryPoint, string, TTransport, TChain>
        | undefined =
        | SmartAccount<TEntryPoint, string, TTransport, TChain>
        | undefined
> = {
    signDelegation: (
        args: SignDelegationParameters<
            TEntryPoint,
            TTransport,
            TChain,
            TAccount
        >
    ) => Promise<Hash>
    encodeCallDataWithCAB: <TChainOverride extends Chain | undefined>(
        args: EncodeCallDataWithCABParameters<
            TEntryPoint,
            TTransport,
            TChain,
            TAccount,
            TChainOverride
        >
    ) => Promise<Hash>
}

const dmActionsEip7710 =
    <
        TEntryPoint extends EntryPoint,
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TAccount extends
            | SmartAccount<TEntryPoint, string, TTransport, TChain>
            | undefined =
            | SmartAccount<TEntryPoint, string, TTransport, TChain>
            | undefined
    >() =>
    (
        client: Client<TTransport, TChain, TAccount>
    ): DMActionsEip7710<TEntryPoint, TTransport, TChain, TAccount> => ({
        signDelegation: (args) =>
            signDelegation(
                client as Client<TTransport, TChain, TAccount>,
                {
                    ...args
                } as SignDelegationParameters<
                    TEntryPoint,
                    TTransport,
                    TChain,
                    TAccount
                >
            ),
        encodeCallDataWithCAB: (args) =>
            encodeCallDataWithCAB(
                client as Client<TTransport, TChain, TAccount>,
                {
                    ...args
                } as EncodeCallDataWithCABParameters<
                    TEntryPoint,
                    TTransport,
                    TChain,
                    TAccount
                >
            )
    })

export { dmActionsEip7710 }
