import type { SmartAccount } from "permissionless/accounts"
import type { EntryPoint } from "permissionless/types"
import type { Chain, Client, Hash, Transport } from "viem"
import {
    type EncodeCallDataWithCABParameters,
    type SendDelegateUserOperationParameters,
    type SendInstallDMAndDelegateUserOperationParameters,
    type SendInstallDMAsExecutorUserOperationParameters,
    type SignDelegationParameters,
    delegate,
    encodeCallDataWithCAB,
    installDMAndDelegate,
    installDMAsExecutor,
    signDelegation
} from "../../actions/index.js"
import type { ENFORCER_VERSION } from "../../enforcers/cab-paymaster/toCABPaymasterEnforcer.js"

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
    installDMAndDelegate: (
        args: SendInstallDMAndDelegateUserOperationParameters<
            TEntryPoint,
            TTransport,
            TChain,
            TAccount
        >
    ) => Promise<Hash>
    installDMAsExecutor: (
        args: SendInstallDMAsExecutorUserOperationParameters<
            TEntryPoint,
            TTransport,
            TChain,
            TAccount
        >
    ) => Promise<Hash>
    delegate: (
        args: SendDelegateUserOperationParameters<
            TEntryPoint,
            TTransport,
            TChain,
            TAccount
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
    >({
        enforcerVersion
    }: {
        enforcerVersion: ENFORCER_VERSION
    }) =>
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
                    ...args,
                    enforcerVersion: enforcerVersion
                } as EncodeCallDataWithCABParameters<
                    TEntryPoint,
                    TTransport,
                    TChain,
                    TAccount
                >
            ),
        installDMAndDelegate: (args) => installDMAndDelegate(client, args),
        installDMAsExecutor: (args) => installDMAsExecutor(client, { ...args }),
        delegate: (args) => delegate(client, args)
    })

export { dmActionsEip7710 }
