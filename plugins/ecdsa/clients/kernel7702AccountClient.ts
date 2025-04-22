import { type KernelSmartAccount7702Implementation } from "../account/create7702KernelAccount.js"
import {
    type Chain,
    type Client,
    type RpcSchema,
    type Transport,
} from "viem"
import {
    type PrepareUserOperationParameters,
    type SmartAccount,
    prepareUserOperation as viemPrepareUserOperation,
    type PrepareUserOperationRequest,
    type PrepareUserOperationReturnType,
    type DeriveSmartAccount,
    type DeriveEntryPointVersion
} from "viem/account-abstraction"

import { createKernelAccountClient } from "@zerodev/sdk/clients"
import { type SmartAccountClientConfig} from "@zerodev/sdk/clients"

export type Create7702KernelAccountClientParameters = Omit<
    SmartAccountClientConfig<
        Transport,
        Chain | undefined,
        SmartAccount<KernelSmartAccount7702Implementation<"0.7">>,
        Client | undefined,
        RpcSchema | undefined
    >,
    "account"
> & {
    account: SmartAccount<KernelSmartAccount7702Implementation<"0.7">>
}

export function create7702KernelAccountClient(
    parameters: Create7702KernelAccountClientParameters
) {
    return createKernelAccountClient({
        ...parameters,
        account: parameters.account as SmartAccount | undefined,
        userOperation: {
            ...parameters.userOperation,
            prepareUserOperation: async <
                _account extends SmartAccount | undefined,
                const _calls extends readonly unknown[],
                _request extends PrepareUserOperationRequest<
                    _account,
                    _accountOverride,
                    _calls,
                    DeriveSmartAccount<_account, _accountOverride>,
                    DeriveEntryPointVersion<
                        DeriveSmartAccount<_account, _accountOverride>
                    >
                >,
                _accountOverride extends SmartAccount | undefined = undefined
            >(
                opClient: Client<Transport, Chain | undefined, _account>,
                opArgs: PrepareUserOperationParameters<
                    _account,
                    _accountOverride,
                    _calls,
                    _request
                >
            ): Promise<
                PrepareUserOperationReturnType<
                    _account,
                    _accountOverride,
                    _calls,
                    _request
                >
            > => {
                // generate authorization only when account is not already authorized
                let authorization = opArgs.authorization || await parameters.account.signAuthorization()
                const finalArgs = {
                    ...opArgs,
                    authorization
                }

                return await viemPrepareUserOperation(opClient, finalArgs as PrepareUserOperationParameters<
                    _account,
                    _accountOverride,
                    _calls,
                    _request
                >)
            }
        }
    })
}

