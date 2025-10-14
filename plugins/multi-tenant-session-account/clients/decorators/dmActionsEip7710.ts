import type { Chain, Client, Hash, Transport } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import {
    // type EncodeCallDataWithCABParameters,
    type SendDelegateUserOperationParameters,
    type SendInstallDMAndDelegateUserOperationParameters,
    type SendInstallDMAsExecutorUserOperationParameters,
    type SignDelegationParameters,
    delegate,
    // encodeCallDataWithCAB,
    installDMAndDelegate,
    installDMAsExecutor,
    signDelegation
} from "../../actions/index.js"
import type { ENFORCER_VERSION } from "../../enforcers/cab-paymaster/toCABPaymasterEnforcer.js"

export type DMActionsEip7710<
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends SmartAccount | undefined = SmartAccount | undefined
> = {
    signDelegation: <
        accountOverride extends SmartAccount | undefined =
            | SmartAccount
            | undefined
    >(
        args: Parameters<
            typeof signDelegation<TSmartAccount, TChain, accountOverride>
        >[1]
    ) => Promise<Hash>
    // encodeCallDataWithCAB: (
    //     args: Parameters<typeof encodeCallDataWithCAB<TSmartAccount, TChain>>[1]
    // ) => Promise<Hash>
    installDMAndDelegate: (
        args: SendInstallDMAndDelegateUserOperationParameters
    ) => Promise<Hash>
    installDMAsExecutor: (
        args: SendInstallDMAsExecutorUserOperationParameters
    ) => Promise<Hash>
    delegate: (args: SendDelegateUserOperationParameters) => Promise<Hash>
}

function dmActionsEip7710({
    enforcerVersion: _enforcerVersion
}: {
    enforcerVersion: ENFORCER_VERSION
}) {
    return <
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends SmartAccount | undefined =
            | SmartAccount
            | undefined,
        accountOverride extends SmartAccount | undefined =
            | SmartAccount
            | undefined
    >(
        client: Client<Transport, TChain, TSmartAccount>
    ): DMActionsEip7710<TChain, TSmartAccount> => ({
        signDelegation: (args) =>
            signDelegation(
                client as Client<Transport, TChain, TSmartAccount>,
                {
                    ...args
                } as SignDelegationParameters<TSmartAccount, accountOverride>
            ),
        // encodeCallDataWithCAB: (args) =>
        //     encodeCallDataWithCAB(client, {
        //         ...args,
        //         enforcerVersion: enforcerVersion
        //     } as EncodeCallDataWithCABParameters<
        //         TSmartAccount,
        //         accountOverride
        //     >),
        installDMAndDelegate: (args) => installDMAndDelegate(client, args),
        installDMAsExecutor: (args) => installDMAsExecutor(client, args),
        delegate: (args) => delegate(client, args)
    })
}

export { dmActionsEip7710 }
