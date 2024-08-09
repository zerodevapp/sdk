import {
    type KernelAccountClient,
    type KernelSmartAccount,
    type SmartAccountClientConfig,
    getUserOperationGasPrice,
    isProviderSet,
    kernelAccountClientActions,
    setPimlicoAsProvider
} from "@zerodev/sdk"
import { getEntryPointVersion } from "permissionless"
import type { SmartAccount } from "permissionless/accounts"
import type {
    Middleware,
    PrepareUserOperationRequestReturnType
} from "permissionless/actions/smartAccount"
import type { EntryPoint, Prettify } from "permissionless/types"
import type { StateOverrides } from "permissionless/types/bundler"
import {
    http,
    type Chain,
    type Client,
    type Transport,
    createClient
} from "viem"
import { type ValidatorType, prepareMultiUserOpRequest } from "./actions"

export type KernelAccountMultiChainClientActions<
    entryPoint extends EntryPoint,
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends SmartAccount<entryPoint> | undefined =
        | SmartAccount<entryPoint>
        | undefined
> = {
    prepareMultiUserOpRequest: <TTransport extends Transport>(
        args: Prettify<
            Parameters<
                typeof prepareMultiUserOpRequest<
                    entryPoint,
                    TTransport,
                    TChain,
                    TSmartAccount
                >
            >[1]
        >,
        validatorType: ValidatorType,
        numOfUserOps: number,
        stateOverrides?: StateOverrides
    ) => Promise<Prettify<PrepareUserOperationRequestReturnType<entryPoint>>>
}

export function kernelAccountMultiChainClientActions<
    entryPoint extends EntryPoint
>({ middleware }: Middleware<entryPoint>) {
    return <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TSmartAccount extends SmartAccount<entryPoint> | undefined =
            | SmartAccount<entryPoint>
            | undefined
    >(
        client: Client<TTransport, TChain, TSmartAccount>
    ): KernelAccountMultiChainClientActions<
        entryPoint,
        TChain,
        TSmartAccount
    > => ({
        prepareMultiUserOpRequest: (
            args,
            validatorType,
            numOfUserOps,
            stateOverrides
        ) =>
            prepareMultiUserOpRequest(
                client,
                {
                    ...args,
                    middleware: {
                        ...middleware,
                        ...args.middleware
                    }
                },
                validatorType,
                numOfUserOps,
                stateOverrides
            )
    })
}

export type KernelMultiChainClient<
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TSmartAccount extends KernelSmartAccount<entryPoint> | undefined =
        | KernelSmartAccount<entryPoint>
        | undefined
> = KernelAccountClient<entryPoint, TTransport, TChain, TSmartAccount> & {
    prepareMultiUserOpRequest: (
        args: Prettify<
            Parameters<
                typeof prepareMultiUserOpRequest<
                    entryPoint,
                    TTransport,
                    TChain,
                    TSmartAccount
                >
            >[1]
        >,
        validatorType: ValidatorType,
        numOfUserOps: number,
        stateOverrides?: StateOverrides
    ) => Promise<Prettify<PrepareUserOperationRequestReturnType<entryPoint>>>
}

export const createKernelMultiChainClient = <
    TSmartAccount extends KernelSmartAccount<TEntryPoint> | undefined,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = undefined,
    TEntryPoint extends EntryPoint = TSmartAccount extends KernelSmartAccount<
        infer U
    >
        ? U
        : never
>(
    parameters: SmartAccountClientConfig<
        TEntryPoint,
        TTransport,
        TChain,
        TSmartAccount
    >
): KernelMultiChainClient<TEntryPoint, TTransport, TChain, TSmartAccount> => {
    const {
        key = "Account",
        name = "Kernel Account Client",
        bundlerTransport,
        entryPoint,
        account
    } = parameters

    if (!account) {
        throw new Error("Kernel account is not provided")
    }

    const entryPointVersion = getEntryPointVersion(entryPoint)
    const shouldIncludePimlicoProvider =
        bundlerTransport({}).config.key === "http" &&
        entryPointVersion === "v0.7"

    const client = createClient({
        ...parameters,
        key,
        name,
        transport: (opts) => {
            let _bundlerTransport = bundlerTransport({
                ...opts,
                retryCount: 0
            })
            if (
                !shouldIncludePimlicoProvider ||
                isProviderSet(_bundlerTransport.value?.url, "ALCHEMY")
            )
                return _bundlerTransport
            _bundlerTransport = http(
                setPimlicoAsProvider(_bundlerTransport.value?.url)
            )({ ...opts, retryCount: 0 })
            return _bundlerTransport
        },
        type: "kernelAccountClient"
    })

    let middleware = parameters.middleware
    if (
        (!middleware ||
            (typeof middleware !== "function" && !middleware.gasPrice)) &&
        client.transport?.url &&
        isProviderSet(client.transport.url, "PIMLICO")
    ) {
        const gasPrice = () => getUserOperationGasPrice(client)
        middleware = {
            ...middleware,
            gasPrice
        }
    }
    return client
        .extend(
            kernelAccountClientActions({
                middleware
            })
        )
        .extend(
            kernelAccountMultiChainClientActions({
                middleware
            })
        ) as KernelMultiChainClient<
        TEntryPoint,
        TTransport,
        TChain,
        TSmartAccount
    >
}
