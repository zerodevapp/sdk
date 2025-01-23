import {
    type BundlerRpcSchema,
    type Chain,
    type Client,
    type ClientConfig,
    type EstimateFeesPerGasReturnType,
    type Prettify,
    type RpcSchema,
    type Transport,
    createClient
} from "viem"
import {
    type BundlerActions,
    type BundlerClientConfig,
    type PaymasterActions,
    type PrepareUserOperationParameters,
    type SmartAccount,
    type UserOperationRequest,
    bundlerActions,
    type prepareUserOperation as viemPrepareUserOperation
} from "viem/account-abstraction"
import { getUserOperationGasPrice } from "../actions/index.js"
import {
    type KernelAccountClientActions,
    kernelAccountClientActions
} from "./decorators/kernel.js"

export type KernelAccountClient<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends SmartAccount | undefined = SmartAccount | undefined,
    client extends Client | undefined = Client | undefined,
    rpcSchema extends RpcSchema | undefined = undefined
> = Prettify<
    Client<
        transport,
        chain extends Chain
            ? chain
            : // biome-ignore lint/suspicious/noExplicitAny: <explanation>
              client extends Client<any, infer chain>
              ? chain
              : undefined,
        account,
        rpcSchema extends RpcSchema
            ? [...BundlerRpcSchema, ...rpcSchema]
            : BundlerRpcSchema,
        BundlerActions<account> & KernelAccountClientActions<chain, account>
    >
> & {
    client: client
    paymaster: BundlerClientConfig["paymaster"] | undefined
    paymasterContext: BundlerClientConfig["paymasterContext"] | undefined
    userOperation: BundlerClientConfig["userOperation"] | undefined
}

export type SmartAccountClientConfig<
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined,
    account extends SmartAccount | undefined = SmartAccount | undefined,
    client extends Client | undefined = Client | undefined,
    rpcSchema extends RpcSchema | undefined = undefined
> = Prettify<
    Pick<
        ClientConfig<transport, chain, account, rpcSchema>,
        | "account"
        | "cacheTime"
        | "chain"
        | "key"
        | "name"
        | "pollingInterval"
        | "rpcSchema"
    >
> & {
    bundlerTransport: transport
    /** Client that points to an Execution RPC URL. */
    client?: client | Client | undefined
    /** Paymaster configuration. */
    paymaster?:
        | true
        | {
              /** Retrieves paymaster-related User Operation properties to be used for sending the User Operation. */
              getPaymasterData?:
                  | PaymasterActions["getPaymasterData"]
                  | undefined
              /** Retrieves paymaster-related User Operation properties to be used for gas estimation. */
              getPaymasterStubData?:
                  | PaymasterActions["getPaymasterStubData"]
                  | undefined
          }
        | undefined
    /** Paymaster context to pass to `getPaymasterData` and `getPaymasterStubData` calls. */
    paymasterContext?: unknown
    /** User Operation configuration. */
    userOperation?:
        | {
              /** Prepares fee properties for the User Operation request. */
              estimateFeesPerGas?:
                  | ((parameters: {
                        account: account | SmartAccount
                        bundlerClient: Client
                        userOperation: UserOperationRequest
                    }) => Promise<EstimateFeesPerGasReturnType<"eip1559">>)
                  | undefined
              /** Prepare User Operation configuration. */
              prepareUserOperation?: typeof viemPrepareUserOperation | undefined
          }
        | undefined
}

export function createKernelAccountClient<
    transport extends Transport,
    chain extends Chain | undefined = undefined,
    account extends SmartAccount | undefined = undefined,
    client extends Client | undefined = undefined,
    rpcSchema extends RpcSchema | undefined = undefined
>(
    parameters: SmartAccountClientConfig<
        transport,
        chain,
        account,
        client,
        rpcSchema
    >
): KernelAccountClient<transport, chain, account, client, rpcSchema>

export function createKernelAccountClient(
    parameters: SmartAccountClientConfig
): KernelAccountClient {
    const {
        client: client_,
        key = "Account",
        name = "Kernel Account Client",
        paymaster,
        paymasterContext,
        bundlerTransport,
        userOperation
    } = parameters

    const client = Object.assign(
        createClient({
            ...parameters,
            chain: parameters.chain ?? client_?.chain,
            transport: bundlerTransport,
            key,
            name,
            type: "kernelAccountClient",
            pollingInterval: parameters.pollingInterval ?? 1000
        }),
        { client: client_, paymaster, paymasterContext, userOperation }
    )

    if (parameters.userOperation?.prepareUserOperation) {
        const customPrepareUserOp =
            parameters.userOperation.prepareUserOperation

        return client
            .extend(bundlerActions)
            .extend((client) => ({
                prepareUserOperation: (
                    args: PrepareUserOperationParameters
                ) => {
                    return customPrepareUserOp(client, args)
                }
            }))
            .extend(bundlerActions)
            .extend((client) => ({
                prepareUserOperation: (
                    args: PrepareUserOperationParameters
                ) => {
                    return customPrepareUserOp(client, args)
                }
            }))
            .extend(kernelAccountClientActions()) as KernelAccountClient
    }

    if (!client.userOperation?.estimateFeesPerGas) {
        client.userOperation = {
            ...client.userOperation,
            estimateFeesPerGas: async ({ bundlerClient }) => {
                return await getUserOperationGasPrice(bundlerClient)
            }
        }
    }

    return client
        .extend(bundlerActions)
        .extend(kernelAccountClientActions()) as KernelAccountClient
}
